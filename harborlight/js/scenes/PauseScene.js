/* Harborlight — Pause overlay for a Night (SCRIPT §9.1 #9): resume, restart,
   sound/music toggles, Keeper's Notes (hints seen so far), quit to Harbor. */
(function () {
  'use strict';
  var UI = window.HLUI;
  var DATA = window.HLData;

  class PauseScene extends Phaser.Scene {
    constructor() { super('Pause'); }

    create(data) {
      var nightId = data && data.nightId;
      var save = UI.getSave(this);
      var self = this;
      var nightScene = this.scene.get('Night');

      UI.dim(this, 80);
      var p = UI.panel(this, 520, 520, { depth: 90 });
      p.add(UI.text(this, 0, -226, 'Paused', { size: 32, bold: true }).setOrigin(0.5));
      p.add(UI.text(this, 0, -188, 'Night ' + nightId + ' — the sea waits for no one, but it waits for you.', { size: 15, color: '#BFE3FF' }).setOrigin(0.5));

      var resume = UI.button(this, 0, -128, 260, 50, 'Resume', function () {
        self.scene.resume('Night');
        self.scene.stop();
      }, { size: 21 });
      p.add(resume);
      var restart = UI.button(this, 0, -62, 260, 50, 'Restart Night', function () {
        self.scene.stop('Night');
        self.scene.start('Night', { nightId: nightId });
        self.scene.stop();
      }, { size: 19 });
      p.add(restart);

      function miniToggle(y, label, key, apply) {
        p.add(UI.text(self, -170, y - 12, label, { size: 17.5, bold: true }));
        var b = UI.button(self, 96, y, 130, 40, save.settings[key] ? 'On' : 'Off', function () {
          save.settings[key] = !save.settings[key];
          apply(save.settings[key]);
          UI.persist(self);
          b.label.setText(save.settings[key] ? 'On' : 'Off');
        }, { size: 16 });
        p.add(b);
      }
      miniToggle(6, 'Sound', 'sound', function (on) { window.HLAudio.setSound(on); });
      miniToggle(58, 'Music', 'music', function (on) { window.HLAudio.setMusic(on); });

      // Keeper's Notes — every hint seen so far in the campaign
      p.add(UI.text(this, -230, 108, "Keeper's Notes", { size: 17, bold: true, color: '#FFC46B' }));
      var seen = save.seenHints.filter(function (k) { return DATA.HINTS[k]; });
      var notes = seen.length
        ? seen.map(function (k) { return '· ' + DATA.HINTS[k]; }).join('\n')
        : 'No notes yet — lessons appear here as you meet them.';
      p.add(UI.text(this, -230, 136, notes, { size: 14.5, color: '#D8E4F5', wrap: 460, lineSpacing: 3 }));

      var quit = UI.button(this, 0, 226, 260, 46, 'Quit to Harbor', function () {
        self.scene.stop('Night');
        self.scene.start('Harbor');
        self.scene.stop();
      }, { size: 18 });
      p.add(quit);

      this.input.keyboard.on('keydown-P', function () {
        self.scene.resume('Night');
        self.scene.stop();
      });
      this.input.keyboard.on('keydown-ESC', function () {
        self.scene.resume('Night');
        self.scene.stop();
      });
    }
  }

  window.HLPauseScene = PauseScene;
})();
