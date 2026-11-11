/* Harborlight — Main menu: the living harbor at night (SCRIPT §9.1 #2). */
(function () {
  'use strict';
  var UI = window.HLUI;
  var DATA = window.HLData;

  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
      document.body.setAttribute('data-hl-boot', 'menu'); // headless smoke-test hook
      var save = UI.getSave(this);

      this.add.image(640, 360, 'sea');
      var sparkles = this.add.tileSprite(640, 360, 1280, 720, 'spark').setAlpha(0.10);
      sparkles.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: sparkles, tilePositionX: 60, tilePositionY: 24, duration: 9000, repeat: -1, ease: 'Linear' });

      // the lighthouse keeps a slow, calm watch of its own
      this.add.image(912, 668, 'lighthouse').setOrigin(0.5, 1).setScale(1.15);
      var lampGlow = this.add.image(912, 668 - 160 * 1.15 + 60 * 1.15, 'glowDot')
        .setScale(2.2).setTint(0xFFC46B).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: lampGlow, alpha: 0.55, scale: 2.5, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.beam = this.add.image(912, 608, 'beamCone').setOrigin(0, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8).setScale(0.8, 1);
      this.beamAngle = -2.2;
      // two ships drift the far water
      var s1 = this.add.image(180, 180, 'ship_FB').setAlpha(0.85);
      var s2 = this.add.image(1080, 120, 'ship_CB').setAlpha(0.8).setFlipX(true);
      this.tweens.add({ targets: s1, x: 420, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: s2, x: 860, duration: 19000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      UI.text(this, 640, 128, 'HARBORLIGHT', { size: 76, bold: true }).setOrigin(0.5);
      UI.text(this, 640, 182, 'Bring every ship home.', { size: 24, color: '#FFC46B' }).setOrigin(0.5);

      var self = this;
      function nextNightId() {
        for (var i = 1; i <= DATA.NIGHTS.length; i++) {
          if (i <= save.unlocked && !(save.stars[i] > 0)) return i;
        }
        return Math.min(save.unlocked, DATA.NIGHTS.length);
      }
      UI.button(this, 640, 292, 300, 54, '⚓  Sail — Night ' + nextNightId(), function () {
        self.scene.start('Night', { nightId: nextNightId() });
      }, { size: 24 });
      UI.button(this, 640, 360, 300, 50, 'Night Select', function () { self.scene.start('NightSelect'); });
      UI.button(this, 640, 424, 300, 50, 'Harbor', function () { self.scene.start('Harbor'); });
      UI.button(this, 640, 488, 300, 50, 'Ship Logbook', function () { self.scene.start('Logbook', { from: 'Menu' }); });
      UI.button(this, 640, 552, 300, 50, 'Settings', function () {
        self.scene.launch('Settings', { from: 'Menu' });
        self.scene.pause();
      });

      var totalStars = Object.values(save.stars).reduce(function (a, b) { return a + b; }, 0);
      UI.text(this, 28, 688, '▣ Cargo ' + save.cargoBank + '    ' + UI.stars(totalStars, DATA.NIGHTS.length * 3) + ' ' + totalStars + ' / ' + (DATA.NIGHTS.length * 3), { size: 19, color: '#BFE3FF' });
      UI.text(this, 1252, 688, 'Slice 1 · v0.1', { size: 15, color: '#7E93B5' }).setOrigin(1, 0);

      // Headless smoke hook: ?smoke walks straight into Night 1.
      if (new URLSearchParams(window.location.search).has('smoke')) {
        this.time.delayedCall(400, function () { self.scene.start('Night', { nightId: 1 }); });
      }
    }

    update(time, delta) {
      // the menu beam sweeps slowly and smoothly — never a snap, never a shake
      this.beamAngle = -Math.PI / 2 + Math.sin(time / 3400) * 0.85;
      if (this.beam) this.beam.rotation = this.beamAngle;
    }
  }

  window.HLMenuScene = MenuScene;
})();
