/* Ronin's Edge — the Duel scene: drives the pure DuelSim with the real clock
   and renders every sim event (telegraph, flash, parry, hit, feint, special).
   Also carries the ?smoke auto-driver (perfect-bot presses) for headless tests. */
(function (root) {
  'use strict';

  class DuelScene extends Phaser.Scene {
    constructor() { super('Duel'); }

    init(data) {
      this.duelistId = (data && data.duelistId) || 1;
      this.smoke = !!(data && data.smoke);
      this.wrongHintsShown = 0;
      this.feintHintShown = false;
      this.spiritHintShown = false;
      this.firstParryDone = false;
      this.ended = false;
    }

    create() {
      var CFG = root.REConfig;
      var DATA = root.REData;
      var UI = root.REUI;
      this.def = DATA.duelistById(this.duelistId);
      var save = root.RESaveData || root.RESave.load();
      this.save = save;
      var sword = DATA.swordById(save.equipped) || DATA.swordById('training');

      this.sim = new root.RELogic.DuelSim(this.def, {
        sword: sword,
        training: save.training || []
      });
      // Expose for headless driving / debugging.
      if (typeof window !== 'undefined') window.__RE_DUEL = { sim: this.sim, scene: this };

      this.buildBackground();
      this.buildFighters();
      this.buildHud();
      this.buildButtons();
      this.buildIntro();

      // Input: keys 1/2/3, Space (special), Esc/P (pause).
      var kb = this.input.keyboard;
      if (kb) {
        kb.on('keydown-ONE', function () { this.press('fire'); }, this);
        kb.on('keydown-TWO', function () { this.press('ice'); }, this);
        kb.on('keydown-THREE', function () { this.press('lightning'); }, this);
        kb.on('keydown-SPACE', function () { this.useSpecial(); }, this);
        kb.on('keydown-ESC', function () { this.openPause(); }, this);
        kb.on('keydown-P', function () { this.openPause(); }, this);
      }

      if (root.REAudio) { root.REAudio.unlock(); root.REAudio.startWind(); }
      if (this.smoke && typeof document !== 'undefined') {
        document.body.dataset.reDuel = 'created';
      }
    }

    buildBackground() {
      var g = this.add.graphics();
      // Dusk sky gradient.
      g.fillGradientStyle(0x1A1A3A, 0x1A1A3A, 0x4A2340, 0x2A1A4A, 1);
      g.fillRect(0, 0, 1280, 520);
      // Sun disc.
      g.fillStyle(0xF5C542, 1);
      g.fillCircle(960, 130, 64);
      g.fillStyle(0xF5C542, 0.25);
      g.fillCircle(960, 130, 88);
      // Mountain silhouettes.
      g.fillStyle(0x1D1D33, 1);
      g.fillTriangle(0, 520, 220, 300, 440, 520);
      g.fillTriangle(300, 520, 560, 330, 820, 520);
      g.fillTriangle(700, 520, 980, 290, 1280, 520);
      // Torii gate silhouette (left).
      g.fillStyle(0x8A2F1D, 1);
      g.fillRect(120, 340, 16, 180);
      g.fillRect(240, 340, 16, 180);
      g.fillRect(100, 330, 176, 16);
      g.fillRect(118, 362, 140, 10);
      // Floor.
      g.fillStyle(0x2A1F1A, 1);
      g.fillRect(0, 520, 1280, 200);
      g.lineStyle(2, 0x1A1410, 1);
      for (var y = 560; y < 720; y += 40) g.lineBetween(0, y, 1280, y);
      // Drifting petals.
      for (var i = 0; i < 10; i++) {
        var p = this.add.image(Math.random() * 1280, Math.random() * 720, 'petal');
        p.setAlpha(0.7);
        this.tweens.add({
          targets: p, y: 740, duration: 10000 + Math.random() * 8000,
          delay: Math.random() * 8000, repeat: -1,
          onRepeat: function (tween, target) {
            target.y = -20;
            target.x = Math.random() * 1280;
          }
        });
        this.tweens.add({
          targets: p, x: '+=' + (30 + Math.random() * 40),
          duration: 1500 + Math.random() * 1000, yoyo: true, repeat: -1
        });
      }
      // Red vignette flash (hit feedback).
      this.vignette = this.add.rectangle(640, 360, 1280, 720, 0xE63B2E, 0);
      this.vignette.setDepth(50);
    }

    buildFighters() {
      var CFG = root.REConfig;
      // Kaito (left, back view).
      this.kaito = this.add.container(CFG.KAITO.x, CFG.KAITO.y);
      this.kaitoBody = this.add.image(0, 0, 'kaito');
      this.kaito.add(this.kaitoBody);
      // Enemy (right).
      this.enemy = this.add.container(CFG.ENEMY.x, CFG.ENEMY.y);
      this.enemyBody = this.add.image(0, 0, 'enemy_' + this.def.id);
      this.enemyGlow = this.add.image(0, -10, 'glow');
      this.enemyGlow.setDisplaySize(260, 260);
      this.enemyGlow.setAlpha(0);
      this.enemyBlade = this.add.image(38, -40, 'blade');
      this.enemyBlade.setOrigin(0.5, 0.9);
      this.enemyBlade.setRotation(0.35);
      this.enemy.add([this.enemyGlow, this.enemyBody, this.enemyBlade]);
      // Idle breathing: subtle bob.
      this.tweens.add({ targets: this.enemy, y: CFG.ENEMY.y - 6, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.kaito, y: CFG.KAITO.y - 4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    buildHud() {
      var UI = root.REUI;
      // Enemy name + HP bar.
      UI.titleText(this, 640, 26, this.def.name + ', ' + this.def.title, 26, '#F5EFE0');
      this.hpBar = UI.makeBar(this, 640, 58, 420, 18, 0xE63B2E);
      // Hearts (top-left).
      this.heartsUi = UI.makeHearts(this, 70, 44, this.sim.maxHearts);
      this.heartsUi.set(this.sim.hearts);
      // Combo (centre-top).
      this.comboText = UI.titleText(this, 640, 108, '', 40, '#F5C542');
      // Hint line (above the buttons with a clear gap — was y=562, half-hidden).
      this.hintText = UI.text(this, 640, 546, '', 22, '#F5EFE0');
      // Spirit bar + Sun Slash button.
      this.spiritBar = UI.makeBar(this, 640, 478, 260, 14, 0xF5C542);
      this.spiritBar.set(this.sim.spirit / 100);
      UI.text(this, 640, 458, 'SPIRIT', 15, '#F5C542');
      this.spiritBtn = this.add.container(640, 508);
      this.spiritBg = this.add.image(0, 0, 'btn_bg');
      this.spiritBg.setDisplaySize(220, 44);
      this.spiritBg.setTint(0x3A3A3A);
      this.spiritBg.setInteractive({ useHandCursor: true });
      this.spiritLabel = UI.titleText(this, 0, -1, 'SUN SLASH', 20, '#8A8A8A');
      this.spiritBtn.add([this.spiritBg, this.spiritLabel]);
      var self = this;
      this.spiritBg.on('pointerdown', function () { self.useSpecial(); });
      // Pause button.
      var pauseBtn = UI.makeButton(this, 1230, 36, 64, 44, 'II', function () { self.openPause(); }, { fontSize: 20 });
      pauseBtn.setDepth(10);
      // Callout anchor (callouts are created on demand).
    }

    buildButtons() {
      var CFG = root.REConfig;
      var UI = root.REUI;
      this.elementBtns = {};
      var xs = [640 - 194, 640, 640 + 194];
      var self = this;
      CFG.ELEMENT_ORDER.forEach(function (elId, i) {
        var el = CFG.ELEMENTS[elId];
        var c = self.add.container(xs[i], CFG.BUTTONS_Y);
        var bg = self.add.image(0, 0, 'btn_bg');
        bg.setDisplaySize(CFG.BUTTON_W, CFG.BUTTON_H);
        bg.setInteractive({ useHandCursor: true });
        var ring = self.add.image(0, 0, 'btn_ring');
        ring.setDisplaySize(CFG.BUTTON_W + 8, CFG.BUTTON_H + 8);
        ring.setTint(el.color);
        ring.setAlpha(0);
        var icon = self.add.image(0, -14, elId === 'lightning' ? 'icon_bolt' : 'icon_' + elId);
        icon.setDisplaySize(52, 52);
        var label = UI.titleText(self, 0, 32, el.name, 20, el.css);
        c.add([bg, ring, icon, label]);
        bg.on('pointerdown', function () { self.press(elId); });
        self.elementBtns[elId] = { container: c, bg: bg, ring: ring, icon: icon, pulse: null };
      });
    }

    buildIntro() {
      var UI = root.REUI;
      this.introGroup = this.add.container(640, 300);
      var banner = UI.panel(this, 0, 0, 560, 170, 0x0D0D1A, 0.92);
      var name = UI.titleText(this, 0, -48, 'DUEL ' + this.def.id + ' — ' + this.def.name, 32, '#F5C542');
      var title = UI.text(this, 0, -8, this.def.title, 20, '#F5EFE0');
      var taunt = UI.text(this, 0, 32, '\u201C' + this.def.taunt + '\u201D', 18, '#BFBFBF');
      taunt.setWordWrapWidth(500);
      this.introGroup.add([banner, name, title, taunt]);
      this.introGroup.setDepth(20);
      this.introGroup.setAlpha(0);
      this.tweens.add({ targets: this.introGroup, alpha: 1, duration: 300 });
      var self = this;
      this.time.delayedCall(1900, function () {
        if (self.introGroup) {
          self.tweens.add({ targets: self.introGroup, alpha: 0, duration: 300,
            onComplete: function () { self.introGroup.destroy(); self.introGroup = null; } });
        }
      });
    }

    showHint(str, holdMs) {
      this.hintText.setText(str);
      this.hintText.setAlpha(1);
      var self = this;
      if (this.hintTimer) this.hintTimer.remove(false);
      if (holdMs) {
        this.hintTimer = this.time.delayedCall(holdMs, function () {
          self.tweens.add({ targets: self.hintText, alpha: 0, duration: 400 });
        });
      }
    }

    press(element) {
      if (this.ended) return;
      var btn = this.elementBtns[element];
      if (btn) {
        this.tweens.add({ targets: btn.container, scaleX: 0.92, scaleY: 0.92, duration: 60, yoyo: true });
      }
      if (root.REAudio) root.REAudio.unlock();
      var r = this.sim.press(element);
      // The sim emits events for parry/hit/fooled/wrong; whiffs are silent.
      return r;
    }

    useSpecial() {
      if (this.ended) return;
      if (this.sim.useSpecial()) {
        // Slow-mo + visuals; damage is applied by the sim.
        this.sim.timeScale = root.REConfig.SPECIAL_TIMESCALE;
        this.tweens.timeScale = root.REConfig.SPECIAL_TIMESCALE;
        var self = this;
        this.time.delayedCall(root.REConfig.SPECIAL_SLOWMO * 1000, function () {
          self.sim.timeScale = 1;
          self.tweens.timeScale = 1;
        });
        var slash = this.add.image(820, 360, 'slash');
        slash.setDisplaySize(560, 140);
        slash.setTint(0xF5C542);
        slash.setAlpha(0);
        slash.setDepth(30);
        this.tweens.add({ targets: slash, alpha: 1, duration: 80, yoyo: true,
          onComplete: function () { slash.destroy(); } });
        this.cameras.main.shake(300, 0.02);
        if (root.REAudio) root.REAudio.special();
        this.updateSpiritUi();
      }
    }

    openPause() {
      if (this.ended) return;
      this.scene.pause();
      this.scene.launch('Pause', { from: 'Duel', duelistId: this.duelistId });
    }

    update(time, delta) {
      if (this.ended) return;
      var dt = Math.min(delta / 1000, 0.05); // clamp huge frames
      this.sim.step(dt);
      var events = this.sim.drainEvents();
      for (var i = 0; i < events.length; i++) this.handleEvent(events[i]);
      if (this.smoke) this.smokeDrive();
    }

    smokeDrive() {
      // Perfect-bot auto-driver for headless tests: press the matching element
      // at each strike flash, skipping feint windows.
      var sim = this.sim;
      if (sim.state !== 'fight' || sim.over) return;
      var a = sim.attack;
      if (!a || a.cancelled) return;
      var s = sim.currentStrike();
      if (!s) return;
      if (a.feintAt && sim.time < a.feintAt + root.REConfig.FEINT_WINDOW_MS / 1000 + 0.05) return;
      if (sim.time >= s.flashAt - 0.005) this.press(s.element);
      if (sim.spirit >= 100) this.useSpecial();
    }

    handleEvent(ev) {
      switch (ev.type) {
        case 'fightStart': this.onFightStart(); break;
        case 'telegraph': this.onTelegraph(ev); break;
        case 'feintFlash': this.onFeintFlash(ev); break;
        case 'flash': this.onFlash(ev); break;
        case 'parry': this.onParry(ev); break;
        case 'hit': this.onHit(ev); break;
        case 'wrong': this.onWrong(ev); break;
        case 'fooled': this.onFooled(ev); break;
        case 'special': break; // visuals handled in useSpecial()
        case 'win': this.onEnd(true, ev.result); break;
        case 'lose': this.onEnd(false, ev.result); break;
      }
    }

    onFightStart() {
      if (this.duelistId === 1) {
        this.showHint(root.REData.HINTS.duel1First);
      }
      if (this.smoke && typeof document !== 'undefined') {
        document.body.dataset.reDuel = 'begun';
      }
    }

    onTelegraph(ev) {
      var CFG = root.REConfig;
      var el = CFG.ELEMENTS[ev.element];
      // Enemy raises the blade; blade + glow take the element colour.
      this.enemyBlade.setTint(el.color);
      this.enemyGlow.setTint(el.color);
      this.tweens.add({ targets: this.enemyBlade, rotation: -1.1, duration: 250, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: this.enemyGlow, alpha: 0.55, duration: 250 });
      // Pulse the matching button.
      this.stopPulses();
      var btn = this.elementBtns[ev.element];
      if (btn) {
        btn.pulse = this.tweens.add({
          targets: btn.container, scaleX: 1.06, scaleY: 1.06,
          duration: 220, yoyo: true, repeat: -1
        });
        this.tweens.add({ targets: btn.ring, alpha: 0.9, duration: 200 });
      }
      if (ev.feintIntro && !this.feintHintShown) {
        this.feintHintShown = true;
        this.showHint(root.REData.HINTS.duel2Feint, 2600);
      }
    }

    onFeintFlash(ev) {
      // Dim flicker, no lunge — the tell for a careful eye.
      this.tweens.add({ targets: this.enemyBlade, alpha: 0.4, duration: 60, yoyo: true });
      var flash = this.add.image(860, 330, 'glow');
      flash.setTint(root.REConfig.ELEMENTS[ev.element].color);
      flash.setDisplaySize(120, 120);
      flash.setAlpha(0.5);
      this.tweens.add({ targets: flash, alpha: 0, duration: 180,
        onComplete: function () { flash.destroy(); } });
    }

    onFlash(ev) {
      // The strike: blade slashes down fast, then returns to guard.
      var self = this;
      this.tweens.add({
        targets: this.enemyBlade, rotation: 1.1, duration: 110, ease: 'Cubic.easeIn',
        onComplete: function () {
          self.tweens.add({ targets: self.enemyBlade, rotation: 0.35, duration: 300, ease: 'Cubic.easeOut' });
          self.tweens.add({ targets: self.enemyGlow, alpha: 0, duration: 300 });
        }
      });
      if (root.REAudio) root.REAudio.whoosh();
      this.stopPulses();
    }

    onParry(ev) {
      var CFG = root.REConfig;
      var UI = root.REUI;
      var el = CFG.ELEMENTS[ev.element];
      var perfect = ev.quality === 'perfect';
      // Hit-stop: freeze the sim clock + dip tween speed briefly.
      this.sim.freeze(perfect ? CFG.HITSTOP_PERFECT : CFG.HITSTOP_GOOD);
      this.tweens.timeScale = 0.1;
      var self = this;
      this.time.delayedCall(perfect ? 80 : 50, function () { self.tweens.timeScale = 1; });
      // Sparks + shake + callout.
      UI.sparkBurst(this, 860, 330, el.color, perfect ? 18 : 10, perfect ? 320 : 220);
      this.cameras.main.shake(perfect ? 140 : 90, perfect ? 0.012 : 0.006);
      UI.callout(this, 640, 250, perfect ? 'PERFECT!' : 'GOOD', perfect ? '#F5C542' : '#F5EFE0', perfect ? 58 : 46);
      // Counter slash across the enemy.
      var slash = this.add.image(820, 360, 'slash');
      slash.setDisplaySize(420, 110);
      slash.setTint(0xFFFFFF);
      slash.setAlpha(0);
      slash.setDepth(30);
      this.tweens.add({ targets: slash, alpha: 1, duration: 70, yoyo: true,
        onComplete: function () { slash.destroy(); } });
      // Enemy stagger.
      this.tweens.add({ targets: this.enemy, x: CFG.ENEMY.x + (perfect ? 26 : 14), duration: 90, yoyo: true });
      this.enemyBody.setTint(0xFFFFFF);
      this.time.delayedCall(90, function () { self.enemyBody.clearTint(); });
      // Combo counter pop.
      this.comboText.setText('x' + ev.combo);
      this.comboText.setScale(1.4);
      this.tweens.add({ targets: this.comboText, scaleX: 1, scaleY: 1, duration: 150 });
      // HUD.
      this.hpBar.set(this.sim.hpFrac());
      this.updateSpiritUi();
      if (!this.firstParryDone) {
        this.firstParryDone = true;
        if (this.duelistId === 1) this.showHint(root.REData.HINTS.duel1AfterFirst, 2000);
        if (this.smoke && typeof document !== 'undefined') {
          document.body.dataset.reFirstParry = this.sim.time.toFixed(1);
        }
      }
      if (root.REAudio) {
        if (perfect) root.REAudio.perfectChime(ev.combo);
        else root.REAudio.clang(ev.combo);
      }
    }

    onHit(ev) {
      var UI = root.REUI;
      // Red vignette flash + Kaito stagger + heart break + combo shatter.
      this.tweens.add({ targets: this.vignette, alpha: 0.35, duration: 60, yoyo: true });
      this.tweens.add({ targets: this.kaito, x: root.REConfig.KAITO.x - 22, duration: 100, yoyo: true });
      this.heartsUi.popLost(ev.hearts, this);
      this.heartsUi.set(ev.hearts);
      this.comboText.setText('');
      UI.callout(this, 640, 250, 'HIT!', '#E63B2E', 48);
      if (root.REAudio) root.REAudio.hit();
    }

    onWrong(ev) {
      if (this.wrongHintsShown < 3) {
        this.wrongHintsShown++;
        this.showHint(root.REData.HINTS.wrongElement, 2200);
      }
    }

    onFooled(ev) {
      root.REUI.callout(this, 640, 250, 'FOOLED!', '#3EC6FF', 48);
      this.comboText.setText('');
      if (root.REAudio) root.REAudio.fooled();
    }

    updateSpiritUi() {
      this.spiritBar.set(this.sim.spirit / 100);
      var ready = this.sim.spirit >= 100;
      this.spiritBg.setTint(ready ? 0xF5C542 : 0x3A3A3A);
      this.spiritLabel.setColor(ready ? '#141428' : '#8A8A8A');
      if (ready && !this.spiritHintShown) {
        this.spiritHintShown = true;
        this.showHint(root.REData.HINTS.spiritReady, 2600);
      }
    }

    stopPulses() {
      var self = this;
      Object.keys(this.elementBtns).forEach(function (k) {
        var b = self.elementBtns[k];
        if (b.pulse) { b.pulse.stop(); b.pulse = null; }
        b.container.setScale(1);
        self.tweens.add({ targets: b.ring, alpha: 0, duration: 150 });
      });
    }

    onEnd(won, result) {
      if (this.ended) return;
      this.ended = true;
      this.stopPulses();
      if (root.REAudio) root.REAudio.stopWind();
      var self = this;
      // Save the result.
      var save = root.RESave.applyDuelResult(this.save, result);
      root.RESave.save(save);
      root.RESaveData = save;
      if (won) {
        if (root.REAudio) root.REAudio.fanfare();
        root.REUI.petalBurst(this, 820, 380, 24);
        this.tweens.add({ targets: this.enemy, alpha: 0, y: 340, duration: 900, ease: 'Cubic.easeOut' });
        root.REUI.callout(this, 640, 250, 'VICTORY!', '#F5C542', 64);
        if (this.smoke && typeof document !== 'undefined') document.body.dataset.reWin = '1';
      } else {
        if (root.REAudio) root.REAudio.lose();
        this.tweens.add({ targets: this.kaito, y: root.REConfig.KAITO.y + 34, rotation: 0.18, duration: 500 });
        root.REUI.callout(this, 640, 250, 'DEFEATED', '#E63B2E', 56);
        if (this.smoke && typeof document !== 'undefined') document.body.dataset.reLose = '1';
      }
      this.time.delayedCall(1600, function () {
        self.scene.start('Result', { result: result, duelistId: self.duelistId });
      });
    }
  }

  root.REDuelScene = DuelScene;
})(typeof window !== 'undefined' ? window : globalThis);
