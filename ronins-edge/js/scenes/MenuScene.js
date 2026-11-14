/* Ronin's Edge — Menu scene: title, Climb / Dojo / How to Play, sound toggle. */
(function (root) {
  'use strict';

  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }
    create() {
      var UI = root.REUI;
      var CFG = root.REConfig;
      // Background: dusk gradient + sun + mountains (same register as the duel).
      var g = this.add.graphics();
      g.fillGradientStyle(0x1A1A3A, 0x1A1A3A, 0x4A2340, 0x2A1A4A, 1);
      g.fillRect(0, 0, 1280, 720);
      g.fillStyle(0xF5C542, 1);
      g.fillCircle(1130, 95, 48); // clear of the title (was 960,140 — overlapped "EDGE")
      g.fillStyle(0x1D1D33, 1);
      g.fillTriangle(0, 560, 220, 330, 440, 560);
      g.fillTriangle(300, 560, 560, 360, 820, 560);
      g.fillTriangle(700, 560, 980, 320, 1280, 560);
      g.fillStyle(0x2A1F1A, 1);
      g.fillRect(0, 560, 1280, 160);

      UI.titleText(this, 640, 130, "RONIN'S EDGE", 84, '#F5C542');
      UI.text(this, 640, 196, 'Parry the flash. Break the master. Climb the mountain.', 24, '#F5EFE0');

      // A lone ronin silhouette on the mountain.
      var kaito = this.add.image(640, 380, 'kaito');
      kaito.setDisplaySize(130, 190);
      this.tweens.add({ targets: kaito, y: 374, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      var self = this;
      UI.makeButton(this, 640, 520, 320, 64, 'CLIMB THE MOUNTAIN', function () {
        self.scene.start('Path');
      }, { color: 0x8A2F1D, hoverColor: 0xA83A24, fontSize: 26 });
      UI.makeButton(this, 470, 606, 240, 52, 'DOJO', function () {
        self.scene.start('Dojo');
      }, { fontSize: 22 });
      UI.makeButton(this, 810, 606, 240, 52, 'HOW TO PLAY', function () {
        self.scene.start('HowTo');
      }, { fontSize: 22 });

      // Sound toggle (bottom-right).
      var save = root.RESaveData || root.RESave.load();
      var sndLabel = save.sound ? 'SOUND: ON' : 'SOUND: OFF';
      var sndBtn = UI.makeButton(this, 1150, 680, 190, 40, sndLabel, function () {
        save.sound = !save.sound;
        root.RESave.save(save);
        root.RESaveData = save;
        if (root.REAudio) root.REAudio.setMuted(!save.sound);
        sndBtn.list[1].setText(save.sound ? 'SOUND: ON' : 'SOUND: OFF');
      }, { fontSize: 16 });
      UI.text(this, 640, 690, 'MECHANICS TEST — is the parry fun? Duels 1–2 of 12', 15, '#8A8A9A');

      if (typeof document !== 'undefined') document.body.dataset.reBoot = 'menu';
      if (typeof window !== 'undefined') window.__RE_MENU = true;
    }
  }

  root.REMenuScene = MenuScene;
})(typeof window !== 'undefined' ? window : globalThis);
