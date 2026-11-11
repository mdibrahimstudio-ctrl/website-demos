/* Harborlight — Ship Logbook: the keeper's journal (SCRIPT §4.5).
   Slice 1 holds the 4 playable classes; unearned entries stay silhouettes. */
(function () {
  'use strict';
  var UI = window.HLUI;
  var DATA = window.HLData;

  class LogbookScene extends Phaser.Scene {
    constructor() { super('Logbook'); }

    create(data) {
      var from = (data && data.from) || 'Menu';
      var save = UI.getSave(this);
      this.add.image(640, 360, 'sea');
      this.add.rectangle(640, 360, 1280, 720, 0x050B16, 0.45);

      var g = this.add.graphics();
      g.fillStyle(0xF7ECD2, 1);
      g.fillRoundedRect(120, 56, 1040, 608, 12);
      g.lineStyle(3, 0xC9A227, 1);
      g.strokeRoundedRect(120, 56, 1040, 608, 12);
      g.lineStyle(1, 0xC9A227, 0.5);
      g.lineBetween(640, 76, 640, 644); // the journal's spine

      UI.text(this, 640, 84, 'Ship Logbook', { size: 34, bold: true, color: '#12233F', shadow: false }).setOrigin(0.5);
      UI.text(this, 640, 122, 'Every hull your light has brought home', { size: 17, color: '#5C4A21', shadow: false }).setOrigin(0.5);

      DATA.LOGBOOK_ORDER.forEach(function (typeId, i) {
        var def = DATA.SHIP_TYPES[typeId];
        var entry = save.logbook[typeId];
        var col = i % 2, row = Math.floor(i / 2);
        var x = col === 0 ? 176 : 688;
        var y = 176 + row * 224;
        var img = this.add.image(x + 74, y + 42, 'ship_' + typeId);
        if (!entry) img.setTint(0x1A2436).setAlpha(0.55);
        UI.text(this, x, y + 92, def.name + ' — ' + def.title, {
          size: 19, bold: true, color: '#12233F', shadow: false, wrap: 420
        });
        if (entry) {
          UI.text(this, x, y + 142, def.story, { size: 15.5, color: '#3D351F', shadow: false, wrap: 440, lineSpacing: 3 });
          UI.text(this, x, y + 196,
            'Guided home ×' + entry.count + '  ·  Cargo ' + entry.cargo + '  ·  First: Night ' + entry.firstNight,
            { size: 14.5, color: '#7A5C14', shadow: false });
        } else {
          UI.text(this, x, y + 142, 'Not yet guided home.', { size: 15.5, color: '#7A7260', shadow: false });
        }
      }, this);

      var self = this;
      var back = UI.button(this, 640, 690, 200, 44, '← Back', function () { self.scene.start(from); }, { size: 19 });
      back.setDepth(5);
    }
  }

  window.HLLogbookScene = LogbookScene;
})();
