/* Harborlight — pure game logic: beam/ship simulation, docking, scoring, stars,
   save model. No Phaser, no DOM — the same code drives the game scenes, the Node
   test suite and the naive-player simulation, so what is tested is what ships.
   Factory: createLogic(CONFIG, DATA). Browser: window.HLLogic. Node: module.exports. */
(function (root) {
  'use strict';

  function createLogic(CFG, DATA) {
    var TAU = Math.PI * 2;
    function rad(d) { return d * Math.PI / 180; }
    function wrapRad(a) {
      a = a % TAU;
      if (a > Math.PI) a -= TAU;
      if (a < -Math.PI) a += TAU;
      return a;
    }
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function turnToward(cur, target, maxStep) {
      var d = wrapRad(target - cur);
      if (Math.abs(d) <= maxStep) return target;
      return cur + Math.sign(d) * maxStep;
    }
    // Clamp an angle into the beam's 200-degree sea-facing arc (SCRIPT §1.1).
    function clampBeamAngle(a) {
      var centre = rad(CFG.BEAM_ARC_CENTRE_DEG);
      var d = wrapRad(a - centre);
      d = clamp(d, -rad(CFG.BEAM_ARC_HALF_DEG), rad(CFG.BEAM_ARC_HALF_DEG));
      return centre + d;
    }
    // Turn effectiveness across the cone (SCRIPT §1.2): 100% in the centre 40%,
    // falling to edgeEff at the rim.
    function beamEffectiveness(offsetFrac) {
      var f = Math.abs(offsetFrac);
      if (f <= CFG.BEAM.centreFrac) return 1;
      return 1 - ((f - CFG.BEAM.centreFrac) / (1 - CFG.BEAM.centreFrac)) * (1 - CFG.BEAM.edgeEff);
    }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    /* ---------------- Stars (SCRIPT §2.4) ---------------- */
    function computeStars(o) {
      if (!o.completed) return 0;
      var cargoFrac = o.manifestCargo > 0 ? o.delivered / o.manifestCargo : 1;
      var stars = 1;
      if (cargoFrac >= 0.75 && o.incidents <= 3) stars = 2;
      if (cargoFrac >= 0.90 && o.incidents <= 1 && o.timeRemaining >= 15) stars = 3;
      return stars;
    }

    /* ---------------- Night simulation ---------------- */
    function NightSim(nightDef, opts) {
      opts = opts || {};
      this.def = nightDef;
      this.halfAngle = rad(opts.halfAngleDeg != null ? opts.halfAngleDeg : CFG.BEAM.halfAngleDeg);
      this.beamLen = opts.beamLength != null ? opts.beamLength : CFG.BEAM.length;
      this.loggedBefore = opts.loggedClasses || {};
      this.time = 0;
      this.over = false; this.completed = false;
      var startDeg = nightDef.beamStartDeg != null ? nightDef.beamStartDeg : -90;
      this.beamStart = rad(startDeg);
      this.beam = { angle: this.beamStart, target: this.beamStart };
      this.pointerSeen = false;
      this.ships = [];
      this.nextShipId = 1;
      this.pending = nightDef.spawns.map(function (s) { return { def: s, done: false }; });
      this.lastSpawnEdge = {};   // edge -> time
      this.manifestCount = nightDef.spawns.length;
      this.manifestCargo = nightDef.spawns.reduce(function (sum, s) {
        return sum + DATA.SHIP_TYPES[s.type].cargo;
      }, 0);
      this.spawnDeadline = nightDef.length - (nightDef.tutorial ? 45 : 35);
      this.combo = { level: 0, lastDockT: null };
      this.newLogs = [];
      this.pairState = {};
      this.collisionHintDone = false;
      this.approachSeen = false;
      this.firstLitDone = false;
      this.berthCount = 0;
      this.stats = {
        docked: 0, delivered: 0, lost: 0, incidents: 0, nearMisses: 0,
        score: 0, bestCombo: 0, firstDockAt: null, byType: {}
      };
    }

    NightSim.prototype.setPointerAngle = function (a) {
      this.beam.target = clampBeamAngle(a);
      this.pointerSeen = true;
    };

    NightSim.prototype.activeCount = function () {
      return this.ships.filter(function (s) { return s.state === 'sail'; }).length;
    };
    NightSim.prototype.anyLit = function () {
      return this.ships.some(function (s) { return s.state === 'sail' && s.lit; });
    };
    NightSim.prototype.timeRemaining = function () {
      return Math.max(0, this.def.length - this.time);
    };
    NightSim.prototype.comboRemaining = function () {
      if (this.combo.lastDockT == null || this.combo.level === 0) return 0;
      return Math.max(0, CFG.COMBO_WINDOW - (this.time - this.combo.lastDockT));
    };

    function edgeOf(spawn) {
      if (spawn.x <= 60) return 'L';
      if (spawn.x >= CFG.FIELD_W - 60) return 'R';
      return 'T';
    }

    NightSim.prototype._spawn = function (spawnDef, events) {
      var def = DATA.SHIP_TYPES[spawnDef.type];
      var ship = {
        id: this.nextShipId++, type: spawnDef.type, def: def,
        x: spawnDef.x, y: spawnDef.y,
        heading: rad(spawnDef.headingDeg), vx: 0, vy: 0, speed: 0,
        crates: def.cargo, state: 'sail',
        lit: false, eff: 0, litTime: 0,
        stunT: 0, slowT: 0, rockImmune: {}, nearMissRocks: {},
        hadIncident: false, capturePassed: false,
        berthT: 0, berthFrom: null, berth: null,
        bobPhase: (this.nextShipId * 1.37) % TAU
      };
      this.ships.push(ship);
      this.lastSpawnEdge[edgeOf(spawnDef)] = { t: spawnDef.t, at: this.time };
      events.push({ type: 'spawn', ship: ship });
      if (spawnDef.type === 'TK') events.push({ type: 'foghorn', ship: ship });
      return ship;
    };

    NightSim.prototype._loseCrate = function (ship, cause, events) {
      if (ship.crates > 0) {
        ship.crates--;
        this.stats.lost++;
        events.push({ type: 'crateLost', ship: ship, cause: cause });
      }
    };

    NightSim.prototype._resetCombo = function () {
      this.combo.level = 0;
      this.combo.lastDockT = null;
    };

    NightSim.prototype.step = function (dt) {
      var events = [];
      if (this.over) return events;
      var CFGd = CFG, def = this.def;
      this.time += dt;
      var i, j, ship;

      /* ---- spawns ---- */
      for (i = 0; i < this.pending.length; i++) {
        var p = this.pending[i];
        if (p.done || p.def.t > this.time) continue;
        if (this.activeCount() >= def.maxActive) continue;
        var edge = edgeOf(p.def);
        var lastEdge = this.lastSpawnEdge[edge];
        // SCRIPT §2.2: no two ships spawn from the same edge within 5 seconds —
        // measured between authored schedule times, so simultaneous authored
        // spawns (same t) still enter together.
        if (lastEdge != null && p.def.t > lastEdge.t && this.time - lastEdge.at < 5) continue;
        p.done = true;
        this._spawn(p.def, events);
      }

      /* ---- beam ---- */
      var target = this.beam.target;
      if (def.tutorial && !this.pointerSeen && this.time >= 5 && this.time < 7.5) {
        // SCRIPT §6: one gentle pre-programmed sway if the player has not dragged yet.
        target = this.beamStart + Math.sin((this.time - 5) / 2.5 * Math.PI) * rad(6);
      }
      var diff = wrapRad(target - this.beam.angle);
      var smooth = diff * (1 - Math.exp(-CFGd.BEAM.smoothing * dt));
      var maxStep = rad(CFGd.BEAM.maxRateDeg) * dt;
      this.beam.angle = wrapRad(this.beam.angle + clamp(smooth, -maxStep, maxStep));

      /* ---- ships: steering & movement ---- */
      for (i = 0; i < this.ships.length; i++) {
        ship = this.ships[i];
        if (ship.state === 'berthing') {
          ship.berthT += dt;
          var pr = easeOutCubic(Math.min(ship.berthT / CFGd.BERTH_TIME, 1));
          ship.x = ship.berthFrom.x + (ship.berth.x - ship.berthFrom.x) * pr;
          ship.y = ship.berthFrom.y + (ship.berth.y - ship.berthFrom.y) * pr;
          ship.heading = ship.berthFrom.heading + wrapRad(ship.berth.heading - ship.berthFrom.heading) * pr;
          if (ship.berthT >= CFGd.BERTH_TIME) this._finishDock(ship, events);
          continue;
        }
        if (ship.state !== 'sail') continue;

        if (ship.stunT > 0) ship.stunT -= dt;
        if (ship.slowT > 0) ship.slowT -= dt;

        var dxL = ship.x - CFGd.LAMP.x, dyL = ship.y - CFGd.LAMP.y;
        var distL = Math.hypot(dxL, dyL);
        var distG = Math.hypot(ship.x - CFGd.GATE.x, ship.y - CFGd.GATE.y);

        // lit test
        ship.lit = false; ship.eff = 0;
        if (distL <= this.beamLen) {
          var off = wrapRad(Math.atan2(dyL, dxL) - this.beam.angle);
          if (Math.abs(off) <= this.halfAngle) {
            ship.lit = true;
            ship.eff = beamEffectiveness(off / this.halfAngle);
            ship.litTime += dt;
            if (!this.firstLitDone && ship.litTime >= 1) {
              this.firstLitDone = true;
              events.push({ type: 'firstLit', ship: ship });
            }
          }
        }

        // The gate lanterns take over inside the approach: a ship that enters the
        // approach lit "has the line" and is guided in by the harbor's own lights —
        // the beam itself can never point down into the harbor (SCRIPT §1.1/§1.3).
        if (distG <= CFGd.APPROACH_R && ship.lit) ship.hasLine = true;
        if (distG > CFGd.APPROACH_R + 10) ship.hasLine = false;
        var guided = ship.lit || (distG <= CFGd.APPROACH_R && ship.hasLine);
        ship.guidedNow = guided;

        // desired heading
        var desired = null;
        if (ship.stunT > 0) {
          desired = null; // stunned: no turning, lit or not (SCRIPT §1.5)
        } else if (guided && distG <= CFGd.APPROACH_R) {
          desired = Math.atan2(CFGd.GATE.y - ship.y, CFGd.GATE.x - ship.x);
          if (!this.approachSeen) {
            this.approachSeen = true;
            events.push({ type: 'approach', ship: ship });
          }
          ship.heading = turnToward(ship.heading, desired, rad(ship.def.turnDeg) * (ship.lit ? ship.eff : 0.8) * dt);
        } else if (ship.lit) {
          {
            var cosA = Math.cos(this.beam.angle), sinA = Math.sin(this.beam.angle);
            var s = dxL * cosA + dyL * sinA;
            if (s < 30) {
              desired = Math.atan2(CFGd.GATE.y - ship.y, CFGd.GATE.x - ship.x);
            } else {
              var look = clamp(ship.speed * 1.15, 46, 130);
              var along = Math.max(s - look, 20);
              desired = Math.atan2(CFGd.LAMP.y + sinA * along - ship.y, CFGd.LAMP.x + cosA * along - ship.x);
            }
          }
          ship.heading = turnToward(ship.heading, desired, rad(ship.def.turnDeg) * ship.eff * dt);
        } else {
          // unlit: sails her last heading — unless the coast shoal catches her, in
          // which case the coast current walks her to a holding point OFF the
          // approach (SCRIPT §6: unlit ships hold, they never dock themselves).
          var m = CFGd.EDGE_MARGIN + ship.def.radius;
          var nearQuay = ship.y > CFGd.FIELD_H - 64 && Math.abs(ship.x - CFGd.GATE.x) > 70;
          if (ship.x < m || ship.x > CFGd.FIELD_W - m || ship.y < m || nearQuay) {
            var gx = ship.x - CFGd.GATE.x, gy = ship.y - CFGd.GATE.y;
            var gl = Math.hypot(gx, gy) || 1;
            var holdX = CFGd.GATE.x + gx / gl * 300, holdY = CFGd.GATE.y + gy / gl * 300;
            var home = Math.atan2(holdY - ship.y, holdX - ship.x);
            ship.heading = turnToward(ship.heading, home, rad(CFGd.COAST_TURN_DEG) * dt);
          }
        }

        // speed
        var targetSpeed = ship.def.speed;
        if (ship.slowT > 0) targetSpeed *= 0.45;
        if (ship.stunT > 0) targetSpeed = ship.def.speed * 0.2;
        if (distG <= CFGd.APPROACH_R) targetSpeed = Math.min(targetSpeed, CFGd.APPROACH_SPEED);
        if (ship.speed < targetSpeed) ship.speed = Math.min(targetSpeed, ship.speed + CFGd.ACCEL * dt);
        else ship.speed = Math.max(targetSpeed, ship.speed - CFGd.DECEL * dt);

        // velocity aligns to heading with the nautical slide (SCRIPT §1.3)
        var k = 1 - Math.exp(-CFGd.VEL_ALIGN * dt);
        ship.vx += (Math.cos(ship.heading) * ship.speed - ship.vx) * k;
        ship.vy += (Math.sin(ship.heading) * ship.speed - ship.vy) * k;
        ship.x = clamp(ship.x + ship.vx * dt, 12, CFGd.FIELD_W - 12);
        ship.y = clamp(ship.y + ship.vy * dt, 12, CFGd.FIELD_H - 8);

        // docking capture — the keeper's light must be on her to bring her through
        // the gate (SCRIPT §6: an unlit ship passes the harbor mouth and holds).
        if (distG <= CFGd.CAPTURE_R) {
          var bearingGate = Math.atan2(CFGd.GATE.y - ship.y, CFGd.GATE.x - ship.x);
          if (ship.guidedNow && Math.abs(wrapRad(ship.heading - bearingGate)) <= rad(CFGd.CAPTURE_HEADING_DEG)) {
            var berth = CFGd.BERTHS[this.berthCount % CFGd.BERTHS.length];
            this.berthCount++;
            ship.state = 'berthing';
            ship.berthT = 0;
            ship.berthFrom = { x: ship.x, y: ship.y, heading: ship.heading };
            ship.berth = { x: berth.x, y: berth.y, heading: berth.x < CFGd.GATE.x ? 0 : Math.PI };
            ship.lit = false;
            events.push({ type: 'berthing', ship: ship });
          } else if (!ship.capturePassed) {
            ship.capturePassed = true;
            events.push({ type: 'missedApproach', ship: ship });
          }
        } else if (distG > CFGd.APPROACH_R) {
          ship.capturePassed = false;
        }
      }

      /* ---- collisions & near misses ---- */
      if (!def.gentle) {
        var sails = this.ships.filter(function (s) { return s.state === 'sail'; });
        for (i = 0; i < sails.length; i++) {
          for (j = i + 1; j < sails.length; j++) {
            var a = sails[i], b = sails[j];
            var key = a.id + ':' + b.id;
            var ps = this.pairState[key] || (this.pairState[key] = { bumpCdUntil: 0, nearMiss: false });
            var dx = b.x - a.x, dy = b.y - a.y;
            var d = Math.hypot(dx, dy);
            var minD = a.def.radius + b.def.radius;
            if (d < minD) {
              // separate along the centre line
              var push = (minD - d) / 2 + 1;
              var nx = d > 0.001 ? dx / d : 1, ny = d > 0.001 ? dy / d : 0;
              a.x -= nx * push; a.y -= ny * push;
              b.x += nx * push; b.y += ny * push;
              if (this.time >= ps.bumpCdUntil) {
                ps.bumpCdUntil = this.time + 2.0; // separation assistance (SCRIPT §1.5)
                a.stunT = 1.1; b.stunT = 1.1;
                // rebound along the line between them (SCRIPT §1.5): headings and
                // drift point away from each other so they cannot re-collide at once
                a.heading = Math.atan2(a.y - b.y, a.x - b.x);
                b.heading = Math.atan2(b.y - a.y, b.x - a.x);
                a.vx = Math.cos(a.heading) * a.def.speed * 0.3;
                a.vy = Math.sin(a.heading) * a.def.speed * 0.3;
                b.vx = Math.cos(b.heading) * b.def.speed * 0.3;
                b.vy = Math.sin(b.heading) * b.def.speed * 0.3;
                a.hadIncident = true; b.hadIncident = true;
                this._loseCrate(a, 'bump', events);
                this._loseCrate(b, 'bump', events);
                this._resetCombo();
                this.stats.incidents++;
                events.push({ type: 'bump', a: a, b: b, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
              }
            } else if (d < minD + CFGd.NEAR_MISS_BAND && !ps.nearMiss) {
              ps.nearMiss = true;
              this.stats.nearMisses++;
              this.stats.score += 15;
              events.push({ type: 'nearMiss', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
            }
            // first collision-course warning (SCRIPT §3.7)
            if (!this.collisionHintDone) {
              var rvx = b.vx - a.vx, rvy = b.vy - a.vy;
              var vv = rvx * rvx + rvy * rvy;
              if (vv > 1) {
                var tCpa = clamp(-(dx * rvx + dy * rvy) / vv, 0, 7);
                if (tCpa > 0.5) {
                  var cx = dx + rvx * tCpa, cy = dy + rvy * tCpa;
                  if (Math.hypot(cx, cy) < 46) {
                    this.collisionHintDone = true;
                    events.push({ type: 'collisionCourse', a: a, b: b });
                  }
                }
              }
            }
          }
        }

        /* ---- rocks ---- */
        var rocks = def.rocks || [];
        for (i = 0; i < this.ships.length; i++) {
          ship = this.ships[i];
          if (ship.state !== 'sail') continue;
          for (var r = 0; r < rocks.length; r++) {
            var rock = rocks[r];
            var rx = ship.x - rock.x, ry = ship.y - rock.y;
            var rd = Math.hypot(rx, ry);
            var rMin = rock.r + ship.def.radius;
            if (rd < rMin) {
              var rnx = rd > 0.001 ? rx / rd : 1, rny = rd > 0.001 ? ry / rd : 0;
              ship.x = rock.x + rnx * (rMin + 0.5);
              ship.y = rock.y + rny * (rMin + 0.5);
              // slide along the edge: snap heading to the tangent nearer her course
              var nAng = Math.atan2(rny, rnx);
              var t1 = nAng + Math.PI / 2, t2 = nAng - Math.PI / 2;
              ship.heading = Math.abs(wrapRad(t1 - ship.heading)) < Math.abs(wrapRad(t2 - ship.heading)) ? t1 : t2;
              if ((ship.rockImmune[r] || 0) <= this.time) {
                ship.rockImmune[r] = this.time + 4;
                ship.slowT = 3;
                ship.hadIncident = true;
                this._loseCrate(ship, 'scrape', events);
                this._resetCombo();
                this.stats.incidents++;
                events.push({ type: 'scrape', ship: ship, x: ship.x, y: ship.y });
              }
            } else if (rd < rMin + CFGd.NEAR_MISS_BAND && !ship.nearMissRocks[r]) {
              ship.nearMissRocks[r] = true;
              this.stats.nearMisses++;
              this.stats.score += 15;
              events.push({ type: 'nearMiss', x: ship.x, y: ship.y });
            }
          }
        }
      }

      /* ---- night end ---- */
      var allSpawned = this.pending.every(function (p) { return p.done; });
      if (allSpawned && this.stats.docked >= this.manifestCount) {
        this.completed = true;
        this.over = true;
        if (this.stats.incidents === 0) this.stats.score += 150;      // Quiet Harbor
        if (this.timeRemaining() >= 30) this.stats.score += 50;       // Before the Bell
        events.push({ type: 'nightComplete', result: this.result() });
      } else if (this.time >= def.length) {
        this.over = true;
        events.push({ type: 'dawnFail', result: this.result() });
      }
      return events;
    };

    NightSim.prototype._finishDock = function (ship, events) {
      ship.state = 'docked';
      var st = this.stats;
      st.docked++;
      st.delivered += ship.crates;
      var bt = st.byType[ship.type] || (st.byType[ship.type] = { docked: 0, crates: 0 });
      bt.docked++; bt.crates += ship.crates;
      // combo (SCRIPT §1.6)
      if (this.combo.lastDockT != null && this.time - this.combo.lastDockT <= CFG.COMBO_WINDOW) {
        this.combo.level += 1;
      } else {
        this.combo.level = 1;
      }
      this.combo.lastDockT = this.time;
      st.bestCombo = Math.max(st.bestCombo, this.combo.level);
      var comboBonus = this.combo.level >= 2 ? Math.min(10 * this.combo.level, 50) : 0;
      st.score += 100 + 10 * ship.crates + (ship.hadIncident ? 0 : 25) + comboBonus;
      var isNewLog = !this.loggedBefore[ship.type] && this.newLogs.indexOf(ship.type) === -1;
      if (isNewLog) {
        this.newLogs.push(ship.type);
        st.score += 50;
      }
      if (st.firstDockAt == null) st.firstDockAt = this.time;
      events.push({
        type: 'docked', ship: ship, crates: ship.crates,
        comboLevel: this.combo.level, newLog: isNewLog
      });
    };

    NightSim.prototype.result = function () {
      var remaining = this.timeRemaining();
      return {
        nightId: this.def.id,
        completed: this.completed,
        docked: this.stats.docked,
        manifestCount: this.manifestCount,
        delivered: this.stats.delivered,
        lost: this.stats.lost,
        manifestCargo: this.manifestCargo,
        incidents: this.stats.incidents,
        nearMisses: this.stats.nearMisses,
        bestCombo: this.stats.bestCombo,
        score: this.stats.score,
        stars: computeStars({
          completed: this.completed, delivered: this.stats.delivered,
          manifestCargo: this.manifestCargo, incidents: this.stats.incidents,
          timeRemaining: remaining
        }),
        timeRemaining: Math.round(remaining),
        newLogs: this.newLogs.slice(),
        byType: this.stats.byType
      };
    };

    /* ---------------- Save model (SCRIPT §9.2) ---------------- */
    function defaultSave() {
      return {
        version: 1,
        unlocked: 1,
        stars: {},
        bestScore: {},
        cargoBank: 0,
        lifetimeCargo: 0,
        upgrades: { wideLens: 0 },
        logbook: {},            // typeId -> {count, cargo, firstNight}
        buildingsRevealed: ['cottage'],
        seenHints: [],
        settings: { sound: true, music: true, hints: true, sensitivity: 'normal' },
        campaignComplete: false,
        stats: { nightsPlayed: 0, shipsDocked: 0, bestCombo: 0 }
      };
    }

    function validateSave(raw) {
      var s = defaultSave();
      if (!raw || typeof raw !== 'object') return s;
      try {
        if (typeof raw.unlocked === 'number') s.unlocked = clamp(Math.floor(raw.unlocked), 1, DATA.NIGHTS.length);
        if (raw.stars && typeof raw.stars === 'object') s.stars = raw.stars;
        if (raw.bestScore && typeof raw.bestScore === 'object') s.bestScore = raw.bestScore;
        if (typeof raw.cargoBank === 'number') s.cargoBank = Math.max(0, Math.floor(raw.cargoBank));
        if (typeof raw.lifetimeCargo === 'number') s.lifetimeCargo = Math.max(0, Math.floor(raw.lifetimeCargo));
        if (raw.upgrades && typeof raw.upgrades.wideLens === 'number') {
          s.upgrades.wideLens = clamp(Math.floor(raw.upgrades.wideLens), 0, DATA.UPGRADES.wideLens.levels.length);
        }
        if (raw.logbook && typeof raw.logbook === 'object') s.logbook = raw.logbook;
        if (Array.isArray(raw.buildingsRevealed) && raw.buildingsRevealed.length) s.buildingsRevealed = raw.buildingsRevealed;
        if (Array.isArray(raw.seenHints)) s.seenHints = raw.seenHints;
        if (raw.settings && typeof raw.settings === 'object') {
          s.settings.sound = raw.settings.sound !== false;
          s.settings.music = raw.settings.music !== false;
          s.settings.hints = raw.settings.hints !== false;
          if (typeof raw.settings.sensitivity === 'string') s.settings.sensitivity = raw.settings.sensitivity;
        }
        s.campaignComplete = raw.campaignComplete === true;
        if (raw.stats && typeof raw.stats === 'object') {
          s.stats.nightsPlayed = raw.stats.nightsPlayed | 0;
          s.stats.shipsDocked = raw.stats.shipsDocked | 0;
          s.stats.bestCombo = raw.stats.bestCombo | 0;
        }
      } catch (e) { return defaultSave(); }
      return s;
    }

    function beamModsFor(save) {
      var lvl = (save.upgrades && save.upgrades.wideLens) || 0;
      return {
        halfAngleDeg: lvl > 0 ? DATA.UPGRADES.wideLens.levels[lvl - 1].halfAngleDeg : CFG.BEAM.halfAngleDeg,
        beamLength: CFG.BEAM.length
      };
    }

    function nextBuilding(save) {
      for (var i = 0; i < DATA.BUILDINGS.length; i++) {
        var b = DATA.BUILDINGS[i];
        if (save.buildingsRevealed.indexOf(b.id) === -1) return b;
      }
      return null;
    }

    // Merge a finished Night's result into the save. Returns {newBuildings:[ids]}.
    function applyNightResult(save, nightDef, result) {
      var id = nightDef.id;
      save.stars[id] = Math.max(save.stars[id] || 0, result.stars);
      save.bestScore[id] = Math.max(save.bestScore[id] || 0, result.score);
      save.cargoBank += result.delivered;
      save.lifetimeCargo += result.delivered;
      if (result.completed) {
        save.unlocked = Math.max(save.unlocked, Math.min(id + 1, DATA.NIGHTS.length));
        if (id >= DATA.NIGHTS.length) save.campaignComplete = true;
      }
      Object.keys(result.byType || {}).forEach(function (t) {
        var e = save.logbook[t] || (save.logbook[t] = { count: 0, cargo: 0, firstNight: id });
        e.count += result.byType[t].docked;
        e.cargo += result.byType[t].crates;
      });
      (result.newLogs || []).forEach(function (t) {
        if (!save.logbook[t]) save.logbook[t] = { count: 0, cargo: 0, firstNight: id };
      });
      save.stats.nightsPlayed++;
      save.stats.shipsDocked += result.docked;
      save.stats.bestCombo = Math.max(save.stats.bestCombo, result.bestCombo);
      var newly = [];
      DATA.BUILDINGS.forEach(function (b) {
        if (b.at <= save.lifetimeCargo && save.buildingsRevealed.indexOf(b.id) === -1) {
          save.buildingsRevealed.push(b.id);
          newly.push(b.id);
        }
      });
      return { newBuildings: newly };
    }

    function buyUpgrade(save, upgradeId) {
      var def = DATA.UPGRADES[upgradeId];
      if (!def) return { ok: false, reason: 'unknown' };
      var lvl = save.upgrades[upgradeId] || 0;
      var maxLvl = def.sliceLevels != null ? def.sliceLevels : def.levels.length;
      if (lvl >= maxLvl) return { ok: false, reason: 'maxed' };
      var cost = def.levels[lvl].cost;
      if (save.cargoBank < cost) return { ok: false, reason: 'funds', need: cost - save.cargoBank };
      save.cargoBank -= cost;
      save.upgrades[upgradeId] = lvl + 1;
      return { ok: true, level: lvl + 1 };
    }

    return {
      NightSim: NightSim,
      computeStars: computeStars,
      beamEffectiveness: beamEffectiveness,
      clampBeamAngle: clampBeamAngle,
      turnToward: turnToward,
      wrapRad: wrapRad,
      rad: rad,
      defaultSave: defaultSave,
      validateSave: validateSave,
      beamModsFor: beamModsFor,
      nextBuilding: nextBuilding,
      applyNightResult: applyNightResult,
      buyUpgrade: buyUpgrade
    };
  }

  var api = null;
  if (typeof window !== 'undefined' && window.HLConfig && window.HLData) {
    api = createLogic(window.HLConfig, window.HLData);
    window.HLLogic = api;
  }
  root.HLLogicFactory = createLogic;
  if (typeof module !== 'undefined' && module.exports) module.exports = createLogic;
})(typeof window !== 'undefined' ? window : globalThis);
