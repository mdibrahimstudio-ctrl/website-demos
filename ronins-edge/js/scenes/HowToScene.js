/* Ronin's Edge — How to Play: 3 steps with icons, one screen. */
(function (root) {
  'use strict';

  class HowToScene extends Phaser.Scene {
    constructor() { super('HowTo'); }
    create() {
      var UI = root.REUI;
      var g = this.add.graphics();
      g.fillGradientStyle(0x1A1A3A, 0x1A1A3A, 0x2A1A4A, 0x1A1A3A, 1);
      g.fillRect(0, 0, 1280, 720);
      UI.titleText(this, 640, 80, 'HOW TO PLAY', 48, '#F5C542');

      var steps = [
        { icon: 'icon_fire', title: '1. Watch the blade', body: 'Your enemy\u2019s blade glows with an element — Fire, Ice, or Lightning. The matching button pulses too.' },
        { icon: 'icon_bolt', title: '2. Tap the matching button when it flashes', body: 'Tap FIRE, ICE, or LIGHTNING at the exact flash. Perfect (right on the flash) hits hardest. Wrong element or bad timing costs a heart.' },
        { icon: 'icon_ice', title: '3. Build Spirit — unleash the Sun Slash', body: 'Perfect parries fill your Spirit meter. When it\u2019s full, tap SUN SLASH for a huge screen-clearing strike.' }
      ];
      for (var i = 0; i < steps.length; i++) {
        var y = 200 + i * 130;
        UI.panel(this, 640, y, 900, 104, 0x1E1E3A, 0.95);
        var icon = this.add.image(260, y, steps[i].icon);
        icon.setDisplaySize(64, 64);
        var t = UI.titleText(this, 320, y - 22, steps[i].title, 24, '#F5EFE0');
        t.setOrigin(0, 0.5);
        var b = UI.text(this, 320, y + 16, steps[i].body, 17, '#BFBFBF');
        b.setOrigin(0, 0.5);
        b.setWordWrapWidth(700);
      }

      UI.text(this, 640, 600, 'Touch: tap the big buttons.  Keyboard: 1 / 2 / 3 for elements, Space for Sun Slash, Esc to pause.', 18, '#8AC48A');
      UI.text(this, 640, 634, 'Beware feints — a dim flicker is a fake flash. Wait for the bright one.', 18, '#3EC6FF');
      var self = this;
      UI.makeButton(this, 640, 690, 220, 52, 'GOT IT', function () {
        self.scene.start('Menu');
      }, { color: 0x8A2F1D, hoverColor: 0xA83A24, fontSize: 22 });
    }
  }

  root.REHowToScene = HowToScene;
})(typeof window !== 'undefined' ? window : globalThis);
