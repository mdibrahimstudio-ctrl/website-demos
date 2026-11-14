/* Ronin's Edge — Result scene: stars, score, honor, stats, one-tap retry. */
(function (root) {
  'use strict';

  class ResultScene extends Phaser.Scene {
    constructor() { super('Result'); }
    init(data) {
      this.result = data.result;
      this.duelistId = data.duelistId;
    }
    create() {
      var UI = root.REUI;
      var DATA = root.REData;
      var r = this.result;
      var du = DATA.duelistById(this.duelistId);

      var g = this.add.graphics();
      g.fillGradientStyle(0x1A1A3A, 0x1A1A3A, r.won ? 0x2A3A1A : 0x3A1A1A, 0x1A1A3A, 1);
      g.fillRect(0, 0, 1280, 720);

      UI.titleText(this, 640, 110, r.won ? 'VICTORY!' : 'DEFEATED', 64, r.won ? '#F5C542' : '#E63B2E');
      UI.text(this, 640, 168, r.won
        ? du.name + ' has fallen. The mountain path opens onward.'
        : du.name + ' stands. The mountain does not forgive — but it waits.', 20, '#F5EFE0');

      // Stars (animated reveal, one by one).
      this.starImgs = [];
      for (var i = 0; i < 3; i++) {
        var st = this.add.image(640 - 90 + i * 90, 260, 'star');
        st.setDisplaySize(72, 72);
        st.setTint(i < r.stars ? 0xF5C542 : 0x3A3A4E);
        st.setScale(0);
        this.starImgs.push(st);
        var self = this;
        (function (img, idx) {
          self.time.delayedCall(300 + idx * 350, function () {
            self.tweens.add({ targets: img, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
            if (idx < r.stars && root.REAudio) root.REAudio.click();
          });
        })(st, i);
      }

      UI.text(this, 640, 340, 'SCORE  ' + r.score, 30, '#F5EFE0');
      UI.text(this, 640, 384, r.won ? 'HONOR EARNED  +' + r.honor : 'No honor earned — win the duel to earn honor.', 22,
        r.won ? '#F5C542' : '#8A8A9A');
      UI.text(this, 640, 432,
        'Perfect: ' + r.perfects + '   Good: ' + r.goods + '   Hits taken: ' + r.hitsTaken +
        '   Best combo: x' + r.maxCombo + '   Time: ' + r.time.toFixed(1) + 's',
        18, '#BFBFBF');

      var self2 = this;
      var nextId = this.duelistId + 1;
      var hasNext = r.won && nextId <= DATA.PROTOTYPE_MAX_DUEL;
      var btnY = 540;
      if (hasNext) {
        UI.makeButton(this, 640, btnY, 320, 60, 'NEXT DUEL', function () {
          self2.scene.start('Duel', { duelistId: nextId });
        }, { color: 0x8A2F1D, hoverColor: 0xA83A24, fontSize: 24 });
        btnY += 80;
      } else if (r.won && this.duelistId >= DATA.PROTOTYPE_MAX_DUEL) {
        UI.text(this, 640, btnY, 'You have beaten every duelist in this prototype — Duels 3–12 arrive in the full game.', 18, '#8AC48A');
        btnY += 60;
      }
      UI.makeButton(this, 470, btnY, 240, 56, 'DUEL AGAIN', function () {
        self2.scene.start('Duel', { duelistId: self2.duelistId });
      }, { fontSize: 22 });
      UI.makeButton(this, 810, btnY, 240, 56, 'MOUNTAIN PATH', function () {
        self2.scene.start('Path');
      }, { fontSize: 22 });
    }
  }

  root.REResultScene = ResultScene;
})(typeof window !== 'undefined' ? window : globalThis);
