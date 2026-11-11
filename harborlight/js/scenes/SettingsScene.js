/* Harborlight — Settings overlay (SCRIPT §9.1 #12): sound / music / hints
   toggles persist immediately; Reset Save sits behind a two-step confirm. */
(function () {
  'use strict';
  var UI = window.HLUI;

  class SettingsScene extends Phaser.Scene {
    constructor() { super('Settings'); }

    create(data) {
      this.from = (data && data.from) || 'Menu';
      var save = UI.getSave(this);
      var self = this;

      UI.dim(this, 80);
      var p = UI.panel(this, 500, 470, { depth: 90 });
      p.add(UI.text(this, 0, -196, 'Settings', { size: 30, bold: true }).setOrigin(0.5));

      function toggleRow(y, label, get, set) {
        p.add(UI.text(self, -210, y - 14, label, { size: 20, bold: true }));
        var pill = self.add.rectangle(0, 0, 96, 42, get() ? 0x2E7D4F : 0x3A4356, 1);
        pill.setStrokeStyle(2, 0xC9A227, 0.85);
        var knob = self.add.circle(get() ? 26 : -26, 0, 15, 0xF7ECD2, 1);
        var stateText = UI.text(self, 0, 0, get() ? 'On' : 'Off', { size: 14, bold: true, shadow: false }).setOrigin(0.5);
        var c = self.add.container(130, y, [pill, knob]);
        pill.setInteractive({ useHandCursor: true });
        pill.on('pointerdown', function () {
          window.HLAudio.unlock();
          var on = !get();
          set(on);
          UI.persist(self);
          pill.setFillStyle(on ? 0x2E7D4F : 0x3A4356, 1);
          self.tweens.add({ targets: knob, x: on ? 26 : -26, duration: 140, ease: 'Quad.easeOut' });
          window.HLAudio.click();
        });
        p.add(c);
        return c;
      }

      toggleRow(-120, 'Sound', function () { return save.settings.sound; }, function (on) {
        save.settings.sound = on;
        window.HLAudio.setSound(on);
      });
      toggleRow(-52, 'Music', function () { return save.settings.music; }, function (on) {
        save.settings.music = on;
        window.HLAudio.setMusic(on);
      });
      toggleRow(16, "Keeper's Hints", function () { return save.settings.hints; }, function (on) {
        save.settings.hints = on;
      });

      // Reset Save — two-step confirm
      var resetBtn = UI.button(this, 0, 96, 240, 46, 'Reset Save', function () {
        resetBtn.setVisible(false);
        confirmBox.setVisible(true);
      }, { size: 18, fill: 0x5C2A1E });
      p.add(resetBtn);
      var confirmBox = this.add.container(0, 96);
      confirmBox.setVisible(false);
      var warn = UI.text(this, 0, -26, 'Erase everything and start over?', { size: 16.5, color: '#FFB35C' }).setOrigin(0.5);
      var eraseBtn = UI.button(this, -72, 14, 128, 40, 'Erase', function () {
        var fresh = window.HLSave.reset();
        UI.setSave(self, fresh);
        window.HLAudio.applySettings(fresh.settings);
        self.scene.stop('Menu');
        self.scene.start('Menu');
        self.scene.stop();
      }, { size: 16, fill: 0x7A2418 });
      var cancelBtn = UI.button(this, 72, 14, 128, 40, 'Cancel', function () {
        confirmBox.setVisible(false);
        resetBtn.setVisible(true);
      }, { size: 16 });
      confirmBox.add([warn, eraseBtn, cancelBtn]);
      p.add(confirmBox);

      p.add(UI.text(this, 0, 168, 'Harborlight — Slice 1 · Made with Phaser 3', { size: 13.5, color: '#7E93B5' }).setOrigin(0.5));

      var back = UI.button(this, 0, 208, 200, 44, '← Back', function () {
        self.scene.resume(self.from);
        self.scene.stop();
      }, { size: 18 });
      p.add(back);
    }
  }

  window.HLSettingsScene = SettingsScene;
})();
