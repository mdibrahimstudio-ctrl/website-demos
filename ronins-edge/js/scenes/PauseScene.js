/* Ronin's Edge — Pause overlay: Resume / Restart / Quit / sound toggle. */
(function (root) {
  'use strict';

  class PauseScene extends Phaser.Scene {
    constructor() { super('Pause'); }
    init(data) {
      this.duelistId = (data && data.duelistId) || 1;
    }
    create() {
      var UI = root.REUI;
      // Dim the paused duel behind.
      this.add.rectangle(640, 360, 1280, 720, 0x0D0D1A, 0.7);
      UI.panel(this, 640, 360, 460, 420, 0x0D0D1A, 0.97);
      UI.titleText(this, 640, 200, 'PAUSED', 44, '#F5C542');
      var self = this;
      UI.makeButton(this, 640, 290, 280, 54, 'RESUME', function () {
        self.scene.stop();
        self.scene.resume('Duel');
      }, { color: 0x8A2F1D, hoverColor: 0xA83A24, fontSize: 22 });
      UI.makeButton(this, 640, 360, 280, 54, 'RESTART DUEL', function () {
        self.scene.stop();
        self.scene.stop('Duel');
        self.scene.start('Duel', { duelistId: self.duelistId });
      }, { fontSize: 22 });
      UI.makeButton(this, 640, 430, 280, 54, 'QUIT TO PATH', function () {
        self.scene.stop();
        self.scene.stop('Duel');
        self.scene.start('Path');
      }, { fontSize: 22 });
      var save = root.RESaveData || root.RESave.load();
      var sndBtn = UI.makeButton(this, 640, 500, 280, 44, save.sound ? 'SOUND: ON' : 'SOUND: OFF', function () {
        save.sound = !save.sound;
        root.RESave.save(save);
        root.RESaveData = save;
        if (root.REAudio) root.REAudio.setMuted(!save.sound);
        sndBtn.list[1].setText(save.sound ? 'SOUND: ON' : 'SOUND: OFF');
      }, { fontSize: 16 });
      // Esc/P resumes too.
      var kb = this.input.keyboard;
      if (kb) {
        kb.on('keydown-ESC', function () {
          self.scene.stop();
          self.scene.resume('Duel');
        });
        kb.on('keydown-P', function () {
          self.scene.stop();
          self.scene.resume('Duel');
        });
      }
    }
  }

  root.REPauseScene = PauseScene;
})(typeof window !== 'undefined' ? window : globalThis);
