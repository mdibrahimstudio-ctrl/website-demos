/* Harborlight — Night Select: lantern nodes on a dotted chart route (SCRIPT §9.1 #6). */
(function () {
  'use strict';
  var UI = window.HLUI;
  var DATA = window.HLData;

  class NightSelectScene extends Phaser.Scene {
    constructor() { super('NightSelect'); }

    create() {
      var save = UI.getSave(this);
      this.add.image(640, 360, 'sea');
      this.add.rectangle(640, 360, 1280, 720, 0x050B16, 0.35);
      UI.text(this, 640, 84, 'Choose a Night', { size: 40, bold: true }).setOrigin(0.5);
      UI.text(this, 640, 128, 'Sea 1 — Moonlit Bay', { size: 20, color: '#FFC46B' }).setOrigin(0.5);

      var g = this.add.graphics();
      g.lineStyle(3, 0xC9A227, 0.5);
      var xs = [250, 640, 1030], y = 360;
      for (var x = xs[0]; x < xs[2]; x += 18) { // dotted route
        g.fillStyle(0xC9A227, 0.55);
        g.fillCircle(x, y, 2.5);
      }

      var self = this;
      DATA.NIGHTS.forEach(function (night, i) {
        var nx = xs[i], locked = night.id > save.unlocked;
        var glow = self.add.image(nx, y, 'glowDot').setScale(2.4)
          .setTint(locked ? 0x44506B : 0xFFC46B).setAlpha(locked ? 0.35 : 0.9);
        if (!locked) {
          self.tweens.add({ targets: glow, scale: 2.8, alpha: 0.6, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        var node = self.add.circle(nx, y, 30, locked ? 0x2A3247 : 0x1B3358, 1);
        node.setStrokeStyle(2, 0xC9A227, locked ? 0.35 : 0.95);
        UI.text(self, nx, y - 4, String(night.id), { size: 26, bold: true, color: locked ? '#7E93B5' : '#F7ECD2' }).setOrigin(0.5);
        UI.text(self, nx, y + 58, 'Night ' + night.id + ' — ' + night.name, { size: 21, bold: true, color: locked ? '#7E93B5' : '#F7ECD2' }).setOrigin(0.5);
        var stars = save.stars[night.id] || 0;
        UI.text(self, nx, y + 90, locked ? 'Locked' : UI.stars(stars), { size: 20, color: '#FFC46B' }).setOrigin(0.5);
        if (locked) {
          UI.text(self, nx, y + 118, 'Complete Night ' + (night.id - 1) + ' to unlock', { size: 15, color: '#7E93B5' }).setOrigin(0.5);
        } else if (save.bestScore[night.id]) {
          UI.text(self, nx, y + 118, 'Best score ' + save.bestScore[night.id], { size: 15, color: '#BFE3FF' }).setOrigin(0.5);
        }
        if (!locked) {
          node.setInteractive({ useHandCursor: true });
          node.on('pointerdown', function () {
            window.HLAudio.unlock(); window.HLAudio.click();
            self.scene.start('Night', { nightId: night.id });
          });
        }
      });

      UI.button(this, 110, 664, 170, 46, '← Menu', function () { self.scene.start('Menu'); }, { size: 19 });
    }
  }

  window.HLNightSelectScene = NightSelectScene;
})();
