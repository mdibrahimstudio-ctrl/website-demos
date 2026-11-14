/* Ronin's Edge — pure duel logic: attack scheduling, parry judgement, feints,
   multi-hit combos, Spirit, hearts, scoring, stars. No Phaser, no DOM — the same
   code drives the game scenes, the Node test suite and the naive-player sim.
   Factory: createLogic(CONFIG, DATA). Browser: window.RELogic. Node: module.exports. */
(function (root) {
  'use strict';

  function createLogic(CFG, DATA) {

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // Deterministic RNG (mulberry32) for tests / daily seeds.
    function makeRng(seed) {
      var s = seed >>> 0;
      return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /* ---------------- DuelSim ----------------
       def: duelist definition (DATA.duelistById).
       opts: { rng, sword (sword def), training (array of training ids) }.
       Clock is in seconds, advanced by step(dt). All judgement uses sim time. */
    function DuelSim(def, opts) {
      opts = opts || {};
      this.def = def;
      this.rng = opts.rng || Math.random;
      this.sword = opts.sword || null;
      this.training = opts.training || [];

      this.state = 'intro';      // intro -> fight -> won | lost
      this.time = 0;
      this.timeScale = 1;
      this.frozen = 0;           // hit-stop: seconds of real time the clock is frozen
      this.introEndsAt = CFG.INTRO_TIME;

      var heartsBonus = 0;
      if (this.sword && this.sword.heartsBonus) heartsBonus += this.sword.heartsBonus;
      if (this.training.indexOf('heart') !== -1) heartsBonus += 1;
      this.maxHearts = CFG.HEARTS_BASE + heartsBonus;
      this.hearts = this.maxHearts;
      this.heartsLost = 0;

      this.enemyHp = def.hp;
      this.enemyMaxHp = def.hp;

      this.spirit = (this.sword && this.sword.startSpirit) ? this.sword.startSpirit : 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.score = 0;
      this.perfects = 0;
      this.goods = 0;
      this.hitsTaken = 0;

      this.events = [];
      this.attackCount = 0;
      this.attack = null;        // the current (pending or resolving) attack
      this.nextAttackAt = null;  // when the next telegraph begins
      this.feintIntroduced = false;
      this.alternateIdx = 0;
      this.stats = { firstParryAt: null, firstTelegraphAt: null };
      this.over = false;
      this._fightStarted = false;
    }

    DuelSim.prototype.hpFrac = function () {
      return this.enemyHp / this.enemyMaxHp;
    };

    DuelSim.prototype._windowBonusMs = function (element) {
      var b = 0;
      if (this.sword && this.sword.windowBonus && this.sword.windowBonus[element]) {
        b += this.sword.windowBonus[element];
      }
      if (this.training.indexOf('grip') !== -1) b += 10;
      return b;
    };

    DuelSim.prototype.windowsFor = function (attack, element) {
      var p = this.def.perfectMs + this._windowBonusMs(element);
      var g = this.def.goodMs + this._windowBonusMs(element);
      if (attack && attack.windowsHalved) {
        p *= CFG.FEINT_WINDOW_HALF;
        g *= CFG.FEINT_WINDOW_HALF;
      }
      return { perfect: p / 1000, good: g / 1000 };
    };

    DuelSim.prototype._spiritMult = function () {
      return this.training.indexOf('flow') !== -1 ? 1.25 : 1;
    };

    DuelSim.prototype._addSpirit = function (n) {
      this.spirit = clamp(this.spirit + n * this._spiritMult(), 0, CFG.SPIRIT_MAX);
    };

    DuelSim.prototype._pickElement = function () {
      var els = this.def.elements;
      if (this.def.alternate && els.length > 1) {
        var el = els[this.alternateIdx % els.length];
        this.alternateIdx++;
        return el;
      }
      return els[Math.floor(this.rng() * els.length)];
    };

    DuelSim.prototype._isFeintAttack = function () {
      var f = this.def.feint;
      if (!f) return false;
      if (f.every) return this.attackCount % f.every === 0;
      // { firstAtHpFrac, chance }: first eligible attack ALWAYS feints (teachable
      // moment), later ones by chance.
      if (this.hpFrac() > f.firstAtHpFrac) return false;
      if (!this.feintIntroduced) return true;
      return this.rng() < f.chance;
    };

    DuelSim.prototype._multiStrikes = function () {
      var m = this.def.multi;
      if (!m) return 1;
      if (this.hpFrac() > m.fromHpFrac) return 1;
      if (this.rng() >= m.chance) return 1;
      var lo = m.strikes[0], hi = m.strikes[1];
      return lo + Math.floor(this.rng() * (hi - lo + 1));
    };

    DuelSim.prototype._scheduleNext = function (prevFlashAt) {
      var def = this.def;
      var interval = lerp(def.interval[0], def.interval[1], 1 - this.hpFrac());
      if (def.enrageAtHpFrac && this.hpFrac() <= def.enrageAtHpFrac) {
        interval /= def.enrageSpeed;
      }
      var flashAt;
      if (prevFlashAt == null) {
        // First attack: scripted slow (SCRIPT §2.3).
        flashAt = this.time + CFG.FIRST_ATTACK_DELAY + CFG.FIRST_TELEGRAPH;
      } else {
        flashAt = prevFlashAt + interval;
      }
      var telegraph = (prevFlashAt == null) ? CFG.FIRST_TELEGRAPH : def.telegraph;
      var telegraphAt = flashAt - telegraph;
      if (telegraphAt < this.time + 0.05) {
        // We resolved late — push the attack out rather than overlapping.
        telegraphAt = this.time + 0.05;
        flashAt = telegraphAt + telegraph;
      }
      this.attackCount++;
      var isFeint = this._isFeintAttack();
      var nStrikes = this._multiStrikes();
      var strikes = [];
      for (var i = 0; i < nStrikes; i++) {
        strikes.push({
          element: this._pickElement(),
          flashAt: flashAt + i * CFG.MULTI_GAP,
          resolved: false,
          result: null
        });
      }
      var feintAt = null;
      if (isFeint) {
        feintAt = Math.max(telegraphAt + 0.15, flashAt - CFG.FEINT_REAL_DELAY);
        if (this.training.indexOf('eye') !== -1) feintAt -= 0.1;
      }
      this.attack = {
        id: this.attackCount,
        telegraphAt: telegraphAt,
        flashAt: flashAt,
        feintAt: feintAt,
        feintFired: false,
        feintParried: false,
        windowsHalved: false,
        telegraphFired: false,
        strikes: strikes,
        cancelled: false
      };
    };

    // Current strike the player must answer: next unresolved strike, or null.
    DuelSim.prototype.currentStrike = function () {
      if (!this.attack || this.attack.cancelled) return null;
      for (var i = 0; i < this.attack.strikes.length; i++) {
        if (!this.attack.strikes[i].resolved) return this.attack.strikes[i];
      }
      return null;
    };

    DuelSim.prototype.freeze = function (seconds) {
      this.frozen = Math.max(this.frozen, seconds);
    };

    DuelSim.prototype.step = function (dt) {
      if (this.over) return;
      if (this.frozen > 0) { this.frozen -= dt; return; } // hit-stop: clock frozen
      this.time += dt * this.timeScale;

      if (this.state === 'intro') {
        if (this.time >= this.introEndsAt) {
          this.state = 'fight';
          this._fightStarted = true;
          this.events.push({ type: 'fightStart', t: this.time });
          this._scheduleNext(null);
        }
        return;
      }
      if (this.state !== 'fight') return;

      var a = this.attack;
      if (!a) { this._scheduleNext(this._lastFlashAt || this.time); return; }

      // Telegraph begins.
      if (!a.telegraphFired && this.time >= a.telegraphAt) {
        a.telegraphFired = true;
        if (this.stats.firstTelegraphAt == null) this.stats.firstTelegraphAt = this.time;
        this.events.push({
          type: 'telegraph', t: this.time, attackId: a.id,
          element: a.strikes[0].element, strikes: a.strikes.length,
          flashAt: a.flashAt, feint: !!a.feintAt,
          feintIntro: !!(a.feintAt && !this.feintIntroduced)
        });
        if (a.feintAt) this.feintIntroduced = true;
      }
      // Feint flash.
      if (a.feintAt && !a.feintFired && this.time >= a.feintAt) {
        a.feintFired = true;
        this.events.push({ type: 'feintFlash', t: this.time, attackId: a.id, element: a.strikes[0].element });
      }
      // Strike flashes + miss detection.
      for (var i = 0; i < a.strikes.length; i++) {
        var s = a.strikes[i];
        if (s.resolved || a.cancelled) continue;
        var w = this.windowsFor(a, s.element);
        if (!s.flashFired && this.time >= s.flashAt) {
          s.flashFired = true;
          this.events.push({ type: 'flash', t: this.time, attackId: a.id, strike: i, element: s.element });
        }
        if (this.time > s.flashAt + w.good) {
          this._resolveStrikeAsHit(a, s, 'missed');
        }
      }
      // All strikes resolved (or cancelled) -> schedule the next attack.
      if (this._attackDone(a) && !this.over) {
        this._lastFlashAt = a.strikes[a.strikes.length - 1].flashAt;
        this._scheduleNext(this._lastFlashAt);
      }
    };

    DuelSim.prototype._attackDone = function (a) {
      if (a.cancelled) return true;
      for (var i = 0; i < a.strikes.length; i++) {
        if (!a.strikes[i].resolved) return false;
      }
      return true;
    };

    DuelSim.prototype._resolveStrikeAsHit = function (attack, strike, reason) {
      strike.resolved = true;
      strike.result = reason; // 'missed' | 'wrong'
      // A missed strike cancels the rest of a multi-hit group (SCRIPT §1.5).
      attack.cancelled = true;
      this.hearts--;
      this.heartsLost++;
      this.hitsTaken++;
      this.combo = 0;
      this.events.push({
        type: 'hit', t: this.time, attackId: attack.id,
        element: strike.element, reason: reason, hearts: this.hearts
      });
      if (this.hearts <= 0) this._endDuel(false);
    };

    DuelSim.prototype._applyParryDamage = function (dmg) {
      this.enemyHp -= dmg;
      if (this.enemyHp <= 0) {
        this.enemyHp = 0;
        this._endDuel(true);
      }
    };

    DuelSim.prototype._endDuel = function (won) {
      this.over = true;
      this.state = won ? 'won' : 'lost';
      if (won) {
        this.score += CFG.SCORE_WIN;
        if (this.heartsLost === 0) this.score += CFG.SCORE_NOHIT;
      }
      this.events.push({ type: won ? 'win' : 'lose', t: this.time, result: this.result() });
    };

    // Player presses an element button. `now` defaults to the sim clock.
    // Returns { result, ... } — result is one of:
    // perfect | good | wrong | fooled | whiff | ignored
    DuelSim.prototype.press = function (element, now) {
      if (this.over || this.state !== 'fight') return { result: 'ignored' };
      if (now == null) now = this.time;
      var a = this.attack;
      if (!a || a.cancelled) return { result: 'whiff' };

      // Feint judgement first: a tap inside the fake-flash window is "fooled".
      if (a.feintAt && !a.feintParried && now <= a.feintAt + CFG.FEINT_WINDOW_MS / 1000) {
        if (Math.abs(now - a.feintAt) <= CFG.FEINT_WINDOW_MS / 1000) {
          a.feintParried = true;
          a.windowsHalved = true;
          this.combo = 0;
          var penalty = CFG.SPIRIT_FEINT_PENALTY;
          if (this.sword && this.sword.feintHalf) penalty = Math.ceil(penalty / 2);
          this.spirit = Math.max(0, this.spirit - penalty);
          this.events.push({ type: 'fooled', t: this.time, attackId: a.id });
          return { result: 'fooled' };
        }
      }

      // Nearest unresolved strike within its Good window.
      var best = null, bestDt = Infinity;
      for (var i = 0; i < a.strikes.length; i++) {
        var s = a.strikes[i];
        if (s.resolved) continue;
        var w = this.windowsFor(a, s.element);
        var dt = Math.abs(now - s.flashAt);
        if (dt <= w.good && dt < bestDt) { best = s; bestDt = dt; }
      }
      if (!best) return { result: 'whiff' };

      if (element !== best.element) {
        this.events.push({ type: 'wrong', t: this.time, attackId: a.id, pressed: element, needed: best.element });
        this._resolveStrikeAsHit(a, best, 'wrong');
        return { result: 'wrong', needed: best.element };
      }

      var w2 = this.windowsFor(a, best.element);
      var isPerfect = bestDt <= w2.perfect;
      best.resolved = true;
      best.result = isPerfect ? 'perfect' : 'good';
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      if (this.stats.firstParryAt == null) this.stats.firstParryAt = this.time;
      var dmg, spiritGain;
      if (isPerfect) {
        this.perfects++;
        dmg = CFG.PERFECT_DAMAGE + ((this.sword && this.sword.perfectDamageBonus) || 0);
        spiritGain = CFG.SPIRIT_PERFECT + ((this.sword && this.sword.spiritBonus) || 0);
        this.score += CFG.SCORE_PERFECT + this.combo * 10;
      } else {
        this.goods++;
        dmg = CFG.GOOD_DAMAGE;
        spiritGain = CFG.SPIRIT_GOOD;
        this.score += CFG.SCORE_GOOD + this.combo * 10;
      }
      this._addSpirit(spiritGain);
      // Full multi-hit parry bonus (SCRIPT §1.5): +15 Spirit, last strike doubled.
      var multiDone = a.strikes.length > 1 && this._attackDone(a);
      if (multiDone) {
        this._addSpirit(CFG.SPIRIT_MULTI_BONUS);
        dmg += (isPerfect ? CFG.PERFECT_DAMAGE : CFG.GOOD_DAMAGE);
      }
      this.events.push({
        type: 'parry', t: this.time, attackId: a.id,
        quality: best.result, element: best.element,
        combo: this.combo, damage: dmg, spirit: this.spirit,
        multiBonus: multiDone
      });
      this._applyParryDamage(dmg);
      return { result: best.result, damage: dmg, combo: this.combo };
    };

    // Sun Slash special (SCRIPT §1.7). Returns true if it fired.
    DuelSim.prototype.useSpecial = function () {
      if (this.over || this.state !== 'fight') return false;
      if (this.spirit < CFG.SPIRIT_MAX) return false;
      var dmg = CFG.SPECIAL_DAMAGE + ((this.sword && this.sword.specialDamageBonus) || 0);
      this.spirit = 0;
      this.events.push({ type: 'special', t: this.time, damage: dmg });
      this._applyParryDamage(dmg);
      return true;
    };

    DuelSim.prototype.stars = function () {
      if (this.state !== 'won') return 0;
      if (this.heartsLost === 0 && this.perfects >= 3) return 3;
      if (this.heartsLost <= 1) return 2;
      return 1;
    };

    DuelSim.prototype.honorEarned = function () {
      if (this.state !== 'won') return 0;
      var h = CFG.HONOR_WIN + this.stars() * CFG.HONOR_PER_STAR;
      h += Math.min(this.perfects * CFG.HONOR_PER_PERFECT, CFG.HONOR_PER_PERFECT_CAP);
      return h;
    };

    DuelSim.prototype.result = function () {
      return {
        won: this.state === 'won',
        stars: this.stars(),
        score: this.score,
        honor: this.honorEarned(),
        perfects: this.perfects,
        goods: this.goods,
        hitsTaken: this.hitsTaken,
        maxCombo: this.maxCombo,
        time: this.time,
        duelistId: this.def.id
      };
    };

    // Drain + clear the pending event list.
    DuelSim.prototype.drainEvents = function () {
      var ev = this.events;
      this.events = [];
      return ev;
    };

    return {
      DuelSim: DuelSim,
      makeRng: makeRng
    };
  }

  var api = null;
  if (typeof window !== 'undefined' && window.REConfig && window.REData) {
    api = createLogic(window.REConfig, window.REData);
    window.RELogic = api;
  }
  root.RELogicFactory = createLogic;
  if (typeof module !== 'undefined' && module.exports) module.exports = createLogic;
})(typeof window !== 'undefined' ? window : globalThis);
