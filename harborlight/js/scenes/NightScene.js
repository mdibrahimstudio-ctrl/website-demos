/* Harborlight — the Night itself (SCRIPT §1, §2, §6, §7, §9.1 #8).
   Renders the pure simulation from logic.js; owns all juice, HUD and hints. */
(function () {
  'use strict';
  var UI = window.HLUI;
  var CFG = window.HLConfig;
  var DATA = window.HLData;
  var L = window.HLLogic;
  var TAU = Math.PI * 2;

  function fmtTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
  }

  class NightScene extends Phaser.Scene {
    constructor() { super('Night'); }

    init(data) {
      this.nightId = (data && data.nightId) || 1;
    }

    create() {
      var save = UI.getSave(this);
      this.save = save;
      this.nightDef = DATA.NIGHTS[this.nightId - 1];
      var mods = L.beamModsFor(save);
      this.sim = new L.NightSim(this.nightDef, {
        halfAngleDeg: mods.halfAngleDeg,
        beamLength: mods.beamLength,
        loggedClasses: save.logbook
      });
      this.running = false;
      this.ended = false;
      this.committed = false;
      this.shipViews = {};
      this.dockedShown = 0;
      this.cargoShown = 0;
      this.lastHum = false;
      this.kbAngle = this.sim.beam.angle;
      this.wakes = [];
      this.wakePool = [];

      this.buildSea();
      this.buildShipsLayer();
      this.buildHUD();
      this.buildIntro();
      this.bindInput();
    }

    /* ---------------- static scene ---------------- */
    buildSea() {
      var CFGd = CFG;
      this.add.image(640, 360, 'sea').setDepth(0);
      this.sparkles = this.add.tileSprite(640, 360, 1280, 720, 'spark').setAlpha(0.08).setDepth(1);
      this.sparkles.setBlendMode(Phaser.BlendModes.ADD);

      // harbor approach + capture rings (faint, honest geometry)
      var g = this.add.graphics().setDepth(2);
      g.lineStyle(2, 0xF7ECD2, 0.10);
      g.strokeCircle(CFGd.GATE.x, CFGd.GATE.y, CFGd.APPROACH_R);
      g.lineStyle(2, 0x51FF7A, 0.16);
      g.strokeCircle(CFGd.GATE.x, CFGd.GATE.y, CFGd.CAPTURE_R);

      // rocks + honest foam boundaries
      (this.nightDef.rocks || []).forEach(function (rock) {
        var img = this.add.image(rock.x, rock.y, 'rock').setDepth(3);
        img.setScale((rock.r * 2 + 22) / 94);
        var ring = this.add.image(rock.x, rock.y, 'foamRing').setDepth(3);
        ring.setScale((rock.r + 15) * 2 / 100);
        this.tweens.add({ targets: ring, scale: ring.scale * 1.07, alpha: 0.55, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }, this);

      // quay
      var q = this.add.graphics().setDepth(4);
      q.fillStyle(0x241A12, 1);
      q.fillRect(0, 664, 1280, 56);
      q.fillStyle(0x3A2A1A, 1);
      q.fillRect(0, 664, 1280, 5);

      // gate buoys
      this.buoyGlowL = this.add.image(CFGd.GATE.x - 56, CFGd.GATE.y - 2, 'glowDot').setScale(0.9).setTint(0x51FF7A).setAlpha(0.45).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
      this.buoyGlowR = this.add.image(CFGd.GATE.x + 56, CFGd.GATE.y - 2, 'glowDot').setScale(0.9).setTint(0x51FF7A).setAlpha(0.45).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
      this.add.image(CFGd.GATE.x - 56, CFGd.GATE.y, 'buoy').setDepth(6);
      this.add.image(CFGd.GATE.x + 56, CFGd.GATE.y, 'buoy').setDepth(6);

      // beam (two passes of the same layered cone read as one soft light)
      this.beamSprite = this.add.image(CFGd.LAMP.x, CFGd.LAMP.y, 'beamCone')
        .setOrigin(0, 0.5).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
      var mods = L.beamModsFor(this.save);
      this.beamSprite.setScale(
        this.sim.beamLen / 760,
        Math.tan(mods.halfAngleDeg * Math.PI / 180) / Math.tan(14 * Math.PI / 180)
      );
      this.beamSprite.rotation = this.sim.beam.angle;

      // lighthouse + lamp
      this.add.image(CFGd.TOWER_BASE.x, 652, 'lighthouse').setOrigin(0.5, 1).setDepth(20);
      this.lampGlow = this.add.image(CFGd.LAMP.x, CFGd.LAMP.y, 'glowDot')
        .setScale(1.7).setTint(0xFFC46B).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);

      // dawn warmth overlay (SCRIPT §2.1: the sky lightens over the final 30s)
      this.dawnOverlay = this.add.rectangle(640, 360, 1280, 720, 0xE8875A, 0).setDepth(40);

      // final-approach thread (redrawn for one ship at a time)
      this.approachLine = this.add.graphics().setDepth(6);
    }

    buildShipsLayer() {
      for (var i = 0; i < 110; i++) {
        var f = this.add.image(-50, -50, 'foam').setDepth(6).setVisible(false);
        this.wakePool.push(f);
      }
    }

    /* ---------------- HUD ---------------- */
    buildHUD() {
      var save = this.save;
      this.hudDepth = 50;
      // dawn timer ring + clock (top-left)
      this.timerGfx = this.add.graphics().setDepth(this.hudDepth);
      this.timeText = UI.text(this, 74, 44, '', { size: 20, bold: true }).setOrigin(0, 0.5).setDepth(this.hudDepth);
      // manifest icons (top-centre)
      this.manifestIcons = [];
      var n = this.nightDef.spawns.length;
      var startX = 640 - (n * 34 - 8) / 2;
      this.nightDef.spawns.forEach(function (s, i) {
        var icon = this.add.image(startX + i * 34, 30, 'ship_' + s.type)
          .setScale(0.42).setAlpha(0.4).setDepth(this.hudDepth);
        this.manifestIcons.push(icon);
      }, this);
      // cargo + score (top-right)
      this.add.image(1030, 30, 'crate').setScale(1.6).setDepth(this.hudDepth);
      this.cargoText = UI.text(this, 1048, 30, '0', { size: 21, bold: true }).setOrigin(0, 0.5).setDepth(this.hudDepth);
      this.scoreText = UI.text(this, 1252, 30, 'Score 0', { size: 19, color: '#BFE3FF' }).setOrigin(1, 0.5).setDepth(this.hudDepth);
      var self = this;
      var pauseBtn = UI.button(this, 1228, 82, 52, 42, 'I I', function () { self.openPause(); }, { size: 15 });
      pauseBtn.setDepth(this.hudDepth);

      // combo (bottom-centre)
      this.comboBox = this.add.container(640, 628).setDepth(this.hudDepth).setVisible(false);
      this.comboText = UI.text(this, 0, -16, '', { size: 25, bold: true, color: '#FFC46B' }).setOrigin(0.5);
      this.comboBarBg = this.add.rectangle(0, 8, 130, 6, 0x000000, 0.45);
      this.comboBar = this.add.rectangle(-65, 8, 130, 6, 0xFFC46B, 0.95).setOrigin(0, 0.5);
      this.comboBox.add([this.comboText, this.comboBarBg, this.comboBar]);

      // hint bar (bottom safe area)
      this.hintBox = this.add.container(640, 586).setDepth(this.hudDepth).setAlpha(0);
      var hbg = this.add.rectangle(0, 0, 600, 40, 0x0B1728, 0.72);
      hbg.setStrokeStyle(1, 0xC9A227, 0.5);
      this.hintText = UI.text(this, 0, 0, '', { size: 17.5, color: '#F7ECD2' }).setOrigin(0.5);
      this.hintBox.add([hbg, this.hintText]);
    }

    /* ---------------- intro ---------------- */
    buildIntro() {
      var def = this.nightDef;
      var save = this.save;
      var dim = UI.dim(this, 79).setAlpha(0.45);
      var p = UI.panel(this, 620, 372, { depth: 85 });
      var self = this;
      p.add(UI.text(this, 0, -148, 'Night ' + def.id + ' — ' + def.name, { size: 31, bold: true }).setOrigin(0.5));
      p.add(UI.text(this, 0, -106, def.lesson, { size: 18.5, color: '#FFC46B', wrap: 520 }).setOrigin(0.5));

      // manifest summary
      var counts = {};
      def.spawns.forEach(function (s) { counts[s.type] = (counts[s.type] || 0) + 1; });
      var types = Object.keys(counts);
      var rowW = types.length * 128;
      types.forEach(function (t, i) {
        var x = -rowW / 2 + i * 128 + 64;
        var img = this.add.image(x, -48, 'ship_' + t).setScale(0.9);
        var tx = UI.text(this, x, -8, DATA.SHIP_TYPES[t].name + ' ×' + counts[t], { size: 14.5, color: '#BFE3FF' }).setOrigin(0.5);
        p.add([img, tx]);
      }, this);

      p.add(UI.text(this, 0, 34, 'Drag anywhere to sweep your light.\nLit ships follow it home. Dock every ship before dawn (' + fmtTime(def.length) + ').', {
        size: 16.5, color: '#D8E4F5', align: 'center', lineSpacing: 5
      }).setOrigin(0.5));
      var best = '';
      if (save.stars[def.id]) best = 'Best: ' + UI.stars(save.stars[def.id]) + '  ·  Score ' + (save.bestScore[def.id] || 0);
      if (best) p.add(UI.text(this, 0, 92, best, { size: 15.5, color: '#BFE3FF' }).setOrigin(0.5));

      this.introParts = { dim: dim, panel: p };
      var begin = UI.button(this, 0, 138, 230, 52, 'Begin the Night', function () {
        self.beginNight();
      }, { size: 20 });
      p.add(begin);

      // Headless smoke hook (?smoke): auto-begin and steer by following the
      // first sailing ship, exposing the run in the DOM for automated checks.
      if (new URLSearchParams(window.location.search).has('smoke')) {
        this.time.delayedCall(300, function () {
          self.beginNight();
          self.smokeDrive = true;
          document.body.setAttribute('data-hl-night', 'begun');
        });
      }
    }

    beginNight() {
      window.HLAudio.unlock();
      window.HLAudio.foghorn();
      if (this.introParts) {
        this.introParts.dim.destroy();
        this.introParts.panel.destroy();
        this.introParts = null;
      }
      this.running = true;
      if (this.nightDef.tutorial) this.showHint('drag');
      if (this.nightDef.id === 2) this.showHint('rock');
    }

    /* ---------------- input ---------------- */
    bindInput() {
      var self = this;
      function aim(pointer) {
        if (!self.running || self.ended) return;
        var dx = pointer.worldX - CFG.LAMP.x, dy = pointer.worldY - CFG.LAMP.y;
        if (Math.hypot(dx, dy) < 70) return; // deadzone around the lamp (SCRIPT §10.1)
        var a = Math.atan2(dy, dx);
        self.kbAngle = a;
        self.sim.setPointerAngle(a);
      }
      this.input.on('pointermove', aim);
      this.input.on('pointerdown', function (p) { window.HLAudio.unlock(); aim(p); });
      this.keys = this.input.keyboard.addKeys('A,D,LEFT,RIGHT');
      this.input.keyboard.on('keydown-P', function () { self.openPause(); });
      this.input.keyboard.on('keydown-ESC', function () { self.openPause(); });
      this.input.keyboard.on('keydown-R', function () {
        if (self.ended) self.scene.restart({ nightId: self.nightId });
      });
    }

    openPause() {
      if (!this.running || this.ended) return;
      this.scene.launch('Pause', { nightId: this.nightId });
      this.scene.pause();
    }

    /* ---------------- hints (SCRIPT §3.7: once per campaign, one line) ---------------- */
    showHint(key) {
      var save = this.save;
      if (!save.settings.hints) return;
      if (save.seenHints.indexOf(key) !== -1) return;
      var line = DATA.HINTS[key];
      if (!line) return;
      save.seenHints.push(key);
      UI.persist(this);
      this.hintText.setText(line);
      this.tweens.killTweensOf(this.hintBox);
      this.hintBox.setAlpha(0);
      this.tweens.add({ targets: this.hintBox, alpha: 1, duration: 300 });
      this.tweens.add({ targets: this.hintBox, alpha: 0, delay: 3600, duration: 700 });
    }

    /* ---------------- ship views ---------------- */
    makeShipView(ship) {
      var def = ship.def;
      var c = this.add.container(ship.x, ship.y).setDepth(10);
      var glow = this.add.image(0, 0, 'glowDot').setTint(def.lantern)
        .setScale((def.w + 44) / 64).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      var hull = this.add.image(0, 0, 'ship_' + ship.type);
      var lantern = this.add.image(def.w / 2 - 4, 0, 'glowDot').setTint(def.lantern)
        .setScale(0.55).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
      var parts = [glow, hull, lantern];
      var pips = [];
      for (var i = 0; i < def.cargo; i++) {
        var pip = this.add.image(-def.w * 0.30 + (i % 6) * 11, i < 6 ? -5 : 7, 'crate').setScale(0.85);
        pips.push(pip);
        parts.push(pip);
      }
      var scratch = this.add.rectangle(def.w * 0.05, def.h * 0.34, def.w * 0.42, 2.5, 0xE8E8E8, 0).setRotation(0.25);
      var stunA = this.add.image(-def.w * 0.3, -def.h * 0.75, 'spark').setVisible(false);
      var stunB = this.add.image(def.w * 0.3, -def.h * 0.75, 'spark').setVisible(false);
      parts.push(scratch, stunA, stunB);
      c.add(parts);
      var view = {
        c: c, hull: hull, glow: glow, lantern: lantern, pips: pips,
        scratch: scratch, stunA: stunA, stunB: stunB,
        prevHeading: ship.heading, roll: 0, lastWake: 0
      };
      this.shipViews[ship.id] = view;
      return view;
    }

    spawnChevron(ship) {
      var x = Phaser.Math.Clamp(ship.x, 40, 1240);
      var y = Phaser.Math.Clamp(ship.y, 40, 660);
      var ch = this.add.image(x, y, 'chev').setDepth(30).setAlpha(0.95);
      ch.rotation = ship.heading;
      this.tweens.add({
        targets: ch, x: x + Math.cos(ship.heading) * 26, y: y + Math.sin(ship.heading) * 26,
        alpha: 0, duration: 1500, onComplete: function () { ch.destroy(); }
      });
    }

    callout(x, y, str, color, size) {
      var t = UI.text(this, x, y, str, { size: size || 22, bold: true, color: color || '#F7ECD2' })
        .setOrigin(0.5).setDepth(60);
      this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 1150, ease: 'Quad.easeOut', onComplete: function () { t.destroy(); } });
    }

    /* ---------------- event juice ---------------- */
    handleEvents(events) {
      var self = this;
      events.forEach(function (ev) {
        var ship = ev.ship;
        switch (ev.type) {
          case 'spawn':
            self.makeShipView(ship);
            self.spawnChevron(ship);
            window.HLAudio.shipBell();
            if (ship.type === 'MC' && self.nightId === 3) self.showHint('clipper');
            break;
          case 'foghorn':
            window.HLAudio.foghorn();
            break;
          case 'firstLit':
            self.showHint('follow');
            break;
          case 'approach':
            self.showHint('gate');
            break;
          case 'missedApproach':
            self.showHint('missed');
            break;
          case 'collisionCourse':
            self.showHint('collision');
            break;
          case 'nearMiss':
            window.HLAudio.whoosh();
            self.callout(ev.x, ev.y - 18, 'CLOSE! +15', '#BFE3FF', 18);
            break;
          case 'bump': {
            window.HLAudio.thunk();
            self.callout(ev.x, ev.y - 24, 'BUMP!', '#FFB35C', 24);
            [0, 130].forEach(function (delay) {
              var ring = self.add.image(ev.x, ev.y, 'ring').setDepth(15).setScale(0.3).setAlpha(0.8);
              self.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 620, delay: delay, onComplete: function () { ring.destroy(); } });
            });
            break;
          }
          case 'scrape': {
            window.HLAudio.scrape();
            var v = self.shipViews[ship.id];
            if (v) v.scratch.setAlpha(0.85);
            for (var i = 0; i < 6; i++) {
              var f = self.getFoam();
              if (!f) break;
              f.setPosition(ship.x + (Math.random() - 0.5) * 26, ship.y + (Math.random() - 0.5) * 18)
                .setScale(0.8 + Math.random() * 0.8).setAlpha(0.5).setVisible(true);
              self.wakes.push({ s: f, life: 0, max: 0.7 });
            }
            break;
          }
          case 'crateLost': {
            window.HLAudio.plop();
            var crate = self.add.image(ship.x, ship.y, 'crate').setScale(1.3).setDepth(16);
            self.tweens.add({
              targets: crate, y: ship.y + 20, alpha: 0, angle: 50, duration: 650,
              onComplete: function () { crate.destroy(); }
            });
            break;
          }
          case 'berthing': {
            // ropes from the ship to the quay
            var g = self.add.graphics().setDepth(8);
            g.lineStyle(1.5, 0xF7ECD2, 0.55);
            g.lineBetween(ship.x - 12, ship.y + 8, ship.berth.x - 16, 668);
            g.lineBetween(ship.x + 12, ship.y + 8, ship.berth.x + 16, 668);
            break;
          }
          case 'docked':
            self.onDocked(ev);
            break;
          case 'nightComplete':
            self.onNightEnd(ev.result, true);
            break;
          case 'dawnFail':
            self.onNightEnd(ev.result, false);
            break;
        }
      });
    }

    onDocked(ev) {
      var ship = ev.ship;
      var self = this;
      window.HLAudio.harborBell();
      this.callout(ship.x, ship.y - 34, 'DOCKED!', '#FFC46B', 24);
      // manifest icon fills in
      var icon = this.manifestIcons[this.dockedShown];
      if (icon) {
        icon.setAlpha(1);
        this.tweens.add({ targets: icon, scale: 0.55, duration: 150, yoyo: true });
      }
      this.dockedShown++;
      // crates fly to the HUD counter, ticking as they land
      for (var i = 0; i < ev.crates; i++) {
        (function (idx) {
          self.time.delayedCall(idx * 95, function () {
            var crate = self.add.image(ship.x, ship.y - 6, 'crate').setScale(1.3).setDepth(55);
            self.tweens.add({
              targets: crate, x: 1030, y: 30, scale: 0.9, duration: 460, ease: 'Quad.easeIn',
              onComplete: function () {
                crate.destroy();
                window.HLAudio.crateTick(idx);
                self.cargoShown++;
                self.cargoText.setText(String(self.cargoShown));
                self.tweens.add({ targets: self.cargoText, scale: 1.3, duration: 90, yoyo: true });
              }
            });
          });
        })(i);
      }
      if (ev.comboLevel >= 2) {
        window.HLAudio.comboChime(ev.comboLevel);
        this.callout(640, 560, 'COMBO ×' + ev.comboLevel, '#FFC46B', 28);
      }
      if (ev.newLog) {
        window.HLAudio.stamp();
        var card = this.add.container(1146, 600).setDepth(65);
        var bg = this.add.rectangle(0, 0, 220, 96, 0x101F36, 0.95);
        bg.setStrokeStyle(2, 0xC9A227, 0.9);
        var img = this.add.image(-64, -12, 'ship_' + ship.type).setScale(0.8);
        var t1 = UI.text(this, -20, -30, 'Logbook', { size: 14, color: '#FFC46B' });
        var t2 = UI.text(this, -20, -8, ship.def.name, { size: 16.5, bold: true });
        var t3 = UI.text(this, -20, 16, 'First time guided home!', { size: 12.5, color: '#BFE3FF' });
        card.add([bg, img, t1, t2, t3]);
        card.setScale(1.5).setAlpha(0);
        this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
        this.tweens.add({ targets: card, alpha: 0, delay: 2400, duration: 500, onComplete: function () { card.destroy(); } });
      }
    }

    /* ---------------- night end ---------------- */
    commitSave(result) {
      if (this.committed) return { newBuildings: [] };
      this.committed = true;
      var applied = L.applyNightResult(this.save, this.nightDef, result);
      UI.persist(this);
      return applied;
    }

    onNightEnd(result, complete) {
      this.ended = true;
      window.HLAudio.setHum(false);
      if (this.smokeDrive) {
        document.body.setAttribute('data-hl-night', complete ? 'complete' : 'failed');
        document.body.setAttribute('data-hl-docked', String(result.docked));
      }
      var applied = this.commitSave(result);
      var self = this;
      if (complete) window.HLAudio.completeBells(); else window.HLAudio.dawnBell();
      this.time.delayedCall(complete ? 1000 : 700, function () {
        self.showSummary(result, complete, applied);
      });
    }

    statRow(p, y, label, value) {
      p.add(UI.text(this, -300, y, label, { size: 17.5, color: '#BFE3FF' }));
      p.add(UI.text(this, 300, y, value, { size: 17.5, bold: true }).setOrigin(1, 0));
    }

    showSummary(result, complete, applied) {
      var self = this;
      UI.dim(this, 79);
      var p = UI.panel(this, 700, 500, { depth: 85 });
      p.add(UI.text(this, 0, -212, complete ? 'All ships home' : 'Dawn came first', { size: 34, bold: true }).setOrigin(0.5));
      if (!complete) {
        p.add(UI.text(this, 0, -172, 'The ships will try again tonight.', { size: 17, color: '#FFC46B' }).setOrigin(0.5));
      }
      if (complete) {
        for (var i = 0; i < 3; i++) {
          (function (idx) {
            var star = UI.text(self, (idx - 1) * 74, -168, '★', { size: 56, color: '#3A4356', shadow: false }).setOrigin(0.5);
            p.add(star);
            if (idx < result.stars) {
              self.time.delayedCall(350 + idx * 380, function () {
                star.setColor('#FFC46B');
                star.setScale(1.9);
                self.tweens.add({ targets: star, scale: 1, duration: 260, ease: 'Back.easeOut' });
                window.HLAudio.starBell(idx);
              });
            }
          })(i);
        }
      }
      var y0 = complete ? -96 : -128;
      this.statRow(p, y0, 'Ships docked', result.docked + ' / ' + result.manifestCount);
      this.statRow(p, y0 + 34, 'Cargo delivered', result.delivered + (result.lost ? '  (' + result.lost + ' lost)' : ''));
      this.statRow(p, y0 + 68, 'Incidents', String(result.incidents));
      this.statRow(p, y0 + 102, 'Best combo', result.bestCombo > 1 ? '×' + result.bestCombo : '—');
      this.statRow(p, y0 + 136, 'Near misses', String(result.nearMisses));
      if (complete) this.statRow(p, y0 + 170, 'Time to spare', fmtTime(result.timeRemaining));
      p.add(UI.text(this, 0, y0 + (complete ? 208 : 176), 'Harbor Score  ' + result.score, { size: 23, bold: true, color: '#FFC46B' }).setOrigin(0.5));

      if (applied.newBuildings && applied.newBuildings.length) {
        var names = applied.newBuildings.map(function (id) {
          var b = DATA.BUILDINGS.find(function (bb) { return bb.id === id; });
          return b ? b.name : id;
        });
        p.add(UI.text(this, 0, y0 + (complete ? 238 : 206), 'New in your harbor: ' + names.join(', ') + '!', { size: 16.5, bold: true, color: '#9FE8A9' }).setOrigin(0.5));
      }

      var by = 216;
      var btns = [];
      if (!complete) {
        btns.push({ label: 'Retry Night', go: function () { self.scene.restart({ nightId: self.nightId }); } });
      } else if (this.nightId < DATA.NIGHTS.length) {
        btns.push({ label: 'Next Night →', go: function () { self.scene.start('Night', { nightId: self.nightId + 1 }); } });
      }
      btns.push({ label: 'Harbor', go: function () { self.scene.start('Harbor', { celebrate: applied.newBuildings || [] }); } });
      btns.push({ label: 'Replay', go: function () { self.scene.restart({ nightId: self.nightId }); } });
      btns.push({ label: 'Night Select', go: function () { self.scene.start('NightSelect'); } });
      var bw = 158, gap = 14;
      var totalW = btns.length * bw + (btns.length - 1) * gap;
      btns.forEach(function (b, i) {
        var btn = UI.button(self, -totalW / 2 + bw / 2 + i * (bw + gap), by, bw, 48, b.label, b.go, { size: 17 });
        p.add(btn);
      });
    }

    /* ---------------- wakes ---------------- */
    getFoam() {
      for (var i = 0; i < this.wakePool.length; i++) {
        if (!this.wakePool[i].visible) return this.wakePool[i];
      }
      return null;
    }

    /* ---------------- per-frame ---------------- */
    update(timeMs, deltaMs) {
      var dt = Math.min(deltaMs / 1000, 0.05);
      var t = timeMs / 1000;
      this.sparkles.tilePositionX += dt * 6;
      this.sparkles.tilePositionY += dt * 2.2;
      this.lampGlow.setAlpha(0.82 + Math.sin(t * 2.6) * 0.14);

      if (this.running && !this.ended) {
        if (this.smokeDrive) {
          var target = this.sim.ships.find(function (sh) { return sh.state === 'sail'; });
          if (target) this.sim.setPointerAngle(Math.atan2(target.y - CFG.LAMP.y, target.x - CFG.LAMP.x));
          if (this.sim.stats.firstDockAt != null && !this._smokeDockSet) {
            this._smokeDockSet = true;
            document.body.setAttribute('data-hl-firstdock', this.sim.stats.firstDockAt.toFixed(1));
          }
        }
        // keyboard steering
        var kb = false;
        if (this.keys.A.isDown || this.keys.LEFT.isDown) { this.kbAngle -= (130 * Math.PI / 180) * dt; kb = true; }
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) { this.kbAngle += (130 * Math.PI / 180) * dt; kb = true; }
        if (kb) this.sim.setPointerAngle(this.kbAngle);

        this.handleEvents(this.sim.step(dt));

        var hum = this.sim.anyLit();
        if (hum !== this.lastHum) { window.HLAudio.setHum(hum); this.lastHum = hum; }

        // dawn sky over the final 30 seconds
        var late = Phaser.Math.Clamp((this.sim.time - (this.nightDef.length - 30)) / 30, 0, 1);
        this.dawnOverlay.setAlpha(late * 0.20);
      }

      this.beamSprite.rotation = this.sim.beam.angle;
      this.syncShips(t, dt);
      this.syncHUD();
    }

    syncShips(t, dt) {
      var self = this;
      this.sim.ships.forEach(function (ship) {
        var v = self.shipViews[ship.id];
        if (!v) return;
        var bobPeriod = 1.6 + (ship.id % 5) * 0.2;
        var bob = Math.sin(t * TAU / bobPeriod + ship.bobPhase) * 2;
        v.c.setPosition(ship.x, ship.y + (ship.state === 'docked' ? bob * 0.5 : bob));
        v.c.rotation = ship.heading;
        // roll into the turn (SCRIPT §1.3: up to ~4 degrees, smooth sine feel)
        var hv = dt > 0 ? L.wrapRad(ship.heading - v.prevHeading) / dt : 0;
        v.prevHeading = ship.heading;
        var targetRoll = Phaser.Math.Clamp(hv * 0.045, -0.07, 0.07);
        v.roll += (targetRoll - v.roll) * 0.18;
        v.hull.setRotation(v.roll);
        // lit glow + lantern
        var targetGlow = ship.lit ? 0.55 : (ship.guidedNow ? 0.28 : 0);
        v.glow.setAlpha(v.glow.alpha + (targetGlow - v.glow.alpha) * 0.25);
        v.lantern.setAlpha(ship.lit ? 1 : 0.75);
        // cargo pips reflect crates still aboard
        v.pips.forEach(function (pip, i) { pip.setVisible(i < ship.crates); });
        // stun stars
        var stunned = ship.stunT > 0;
        v.stunA.setVisible(stunned); v.stunB.setVisible(stunned);
        if (stunned) {
          var a = t * 4.2;
          v.stunA.setPosition(Math.cos(a) * ship.def.w * 0.30, -ship.def.h * 0.8 + Math.sin(a) * 3);
          v.stunB.setPosition(Math.cos(a + Math.PI) * ship.def.w * 0.30, -ship.def.h * 0.8 + Math.sin(a + Math.PI) * 3);
        }
        // wake trail
        if (ship.state === 'sail' && ship.speed > 12 && t - v.lastWake > 0.07) {
          v.lastWake = t;
          var f = self.getFoam();
          if (f) {
            f.setPosition(
              ship.x - Math.cos(ship.heading) * (ship.def.w / 2 + 2),
              ship.y - Math.sin(ship.heading) * (ship.def.w / 2 + 2) + bob
            );
            f.setScale(0.5 + Math.random() * 0.7).setAlpha(0.30).setVisible(true);
            self.wakes.push({ s: f, life: 0, max: 1.3 });
          }
        }
      });
      // fade wakes
      for (var i = this.wakes.length - 1; i >= 0; i--) {
        var w = this.wakes[i];
        w.life += dt;
        var f2 = 1 - w.life / w.max;
        if (f2 <= 0) { w.s.setVisible(false); this.wakes.splice(i, 1); }
        else { w.s.setAlpha(0.30 * f2); w.s.setScale(w.s.scale + dt * 0.7); }
      }
      // approach thread + buoy glow for the first ship inside the approach
      this.approachLine.clear();
      var inApproach = null;
      this.sim.ships.forEach(function (ship) {
        if (ship.state === 'sail' &&
            Math.hypot(ship.x - CFG.GATE.x, ship.y - CFG.GATE.y) <= CFG.APPROACH_R) {
          inApproach = inApproach || ship;
        }
      });
      if (inApproach) {
        this.approachLine.lineStyle(2, 0xF7ECD2, 0.30);
        this.approachLine.lineBetween(inApproach.x, inApproach.y, CFG.GATE.x, CFG.GATE.y);
      }
      var buoyAlpha = inApproach ? 0.95 : 0.45;
      this.buoyGlowL.setAlpha(buoyAlpha);
      this.buoyGlowR.setAlpha(buoyAlpha);
    }

    syncHUD() {
      var sim = this.sim;
      // timer ring: remaining fraction of the night
      var frac = Phaser.Math.Clamp(sim.timeRemaining() / this.nightDef.length, 0, 1);
      var g = this.timerGfx;
      g.clear();
      g.lineStyle(3, 0xF7ECD2, 0.25);
      g.strokeCircle(44, 44, 19);
      g.lineStyle(4, frac < 0.18 ? 0xE4572E : 0xC9A227, 0.95);
      g.beginPath();
      g.arc(44, 44, 19, -Math.PI / 2, -Math.PI / 2 + frac * TAU, false);
      g.strokePath();
      this.timeText.setText(fmtTime(sim.timeRemaining()));
      this.timeText.setColor(frac < 0.18 ? '#E4572E' : '#F7ECD2');
      this.scoreText.setText('Score ' + sim.stats.score);
      // combo
      var rem = sim.comboRemaining();
      if (rem > 0 && sim.combo.level >= 1) {
        this.comboBox.setVisible(true);
        this.comboText.setText(sim.combo.level >= 2 ? 'COMBO ×' + sim.combo.level : 'COMBO');
        this.comboBar.setScale(rem / CFG.COMBO_WINDOW, 1);
      } else {
        this.comboBox.setVisible(false);
      }
    }
  }

  window.HLNightScene = NightScene;
})();
