/* Ronin's Edge — Mountain Path scene: 12 gates on a winding path.
   Tap an unlocked gate to see the duelist card and start the duel.
   Prototype: duels 1–2 playable, 3–12 locked silhouettes. */
(function (root) {
  'use strict';

  // Winding path: 12 node positions, bottom (gate 1) to top (gate 12).
  var NODES = [
    { x: 300, y: 620 }, { x: 560, y: 600 }, { x: 820, y: 620 }, { x: 1020, y: 560 },
    { x: 900, y: 460 }, { x: 640, y: 480 }, { x: 380, y: 450 }, { x: 240, y: 350 },
    { x: 460, y: 300 }, { x: 720, y: 320 }, { x: 940, y: 240 }, { x: 640, y: 140 }
  ];

  class PathScene extends Phaser.Scene {
    constructor() { super('Path'); }
    create() {
      var UI = root.REUI;
      var DATA = root.REData;
      var save = root.RESaveData || root.RESave.load();
      this.save = save;

      var g = this.add.graphics();
      g.fillGradientStyle(0x1A1A3A, 0x1A1A3A, 0x2A1A4A, 0x4A2340, 1);
      g.fillRect(0, 0, 1280, 720);
      g.fillStyle(0xF5C542, 1);
      g.fillCircle(1120, 110, 46);

      UI.titleText(this, 640, 44, 'MOUNT KUROGANE', 40, '#F5C542');
      UI.text(this, 190, 44, 'HONOR: ' + save.honor, 22, '#F5C542');

      var self = this;
      UI.makeButton(this, 1120, 44, 160, 44, 'DOJO', function () {
        self.scene.start('Dojo');
      }, { fontSize: 18 });
      UI.makeButton(this, 90, 680, 140, 40, 'MENU', function () {
        self.scene.start('Menu');
      }, { fontSize: 16 });

      // The winding path.
      g.lineStyle(6, 0x8A6D3B, 0.8);
      g.beginPath();
      g.moveTo(NODES[0].x, NODES[0].y);
      for (var i = 1; i < NODES.length; i++) g.lineTo(NODES[i].x, NODES[i].y);
      g.strokePath();

      // Nodes.
      this.nodeObjs = [];
      var maxPlayable = Math.min(save.unlocked, DATA.PROTOTYPE_MAX_DUEL + 1);
      for (var n = 0; n < 12; n++) {
        var du = DATA.DUELISTS[n];
        var pos = NODES[n];
        var stars = save.stars[String(du.id)] || 0;
        var unlocked = du.id <= save.unlocked;
        var playable = unlocked && du.id <= DATA.PROTOTYPE_MAX_DUEL;
        var completed = stars > 0;
        var circle = this.add.circle(pos.x, pos.y, 30,
          completed ? 0xF5C542 : (playable ? 0xE63B2E : 0x3A3A4E));
        circle.setStrokeStyle(3, 0xF5EFE0, 0.8);
        var label = UI.text(this, pos.x, pos.y, String(du.id), 22, completed ? '#141428' : '#F5EFE0');
        if (!unlocked || !playable) {
          var lock = this.add.image(pos.x, pos.y - 34, 'lock');
          lock.setDisplaySize(20, 24);
          lock.setAlpha(0.8);
        }
        if (playable && !completed) {
          this.tweens.add({ targets: circle, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1 });
        }
        if (completed) {
          for (var s = 0; s < stars; s++) {
            var st = this.add.image(pos.x - 22 + s * 22, pos.y + 42, 'star');
            st.setDisplaySize(18, 18);
          }
        }
        // Name label under the node.
        UI.text(this, pos.x, pos.y + 66, unlocked ? du.name : '???', 15, unlocked ? '#F5EFE0' : '#6B6B85');
        if (playable) {
          circle.setInteractive({ useHandCursor: true });
          (function (duelist) {
            circle.on('pointerdown', function () { self.showCard(duelist); });
          })(du);
        }
        this.nodeObjs.push(circle);
      }

      // Card panel (hidden until a node is tapped).
      this.card = this.add.container(640, 360);
      this.card.setVisible(false);
      this.card.setDepth(20);
      var cardPanel = UI.panel(this, 0, 0, 520, 320, 0x0D0D1A, 0.97);
      this.cardName = UI.titleText(this, 0, -120, '', 30, '#F5C542');
      this.cardTitle = UI.text(this, 0, -82, '', 20, '#F5EFE0');
      this.cardTaunt = UI.text(this, 0, -34, '', 17, '#BFBFBF');
      this.cardTaunt.setWordWrapWidth(440);
      this.cardStats = UI.text(this, 0, 22, '', 18, '#F5C542');
      var self2 = this;
      this.cardDuelBtn = UI.makeButton(this, 0, 96, 260, 56, 'DUEL', function () {
        if (self2.selectedDuelist) {
          self2.scene.start('Duel', { duelistId: self2.selectedDuelist.id });
        }
      }, { color: 0x8A2F1D, hoverColor: 0xA83A24, fontSize: 24 });
      this.cardClose = UI.makeButton(this, 220, -132, 52, 40, 'X', function () {
        self2.card.setVisible(false);
      }, { fontSize: 18 });
      this.card.add([cardPanel, this.cardName, this.cardTitle, this.cardTaunt,
        this.cardStats, this.cardDuelBtn, this.cardClose]);

      // (Footer note removed: it overlapped the node name labels. Locks + "???"
      // communicate the locked gates; the Result screen explains after Duel 2.)
    }

    showCard(du) {
      var save = this.save;
      var stars = save.stars[String(du.id)] || 0;
      var best = save.bestScore[String(du.id)] || 0;
      var perfects = save.perfects[String(du.id)] || 0;
      this.selectedDuelist = du;
      this.cardName.setText('DUEL ' + du.id + ' — ' + du.name);
      this.cardTitle.setText(du.title + '  ·  ' + du.elements.map(function (e) { return e.toUpperCase(); }).join(' + '));
      this.cardTaunt.setText('\u201C' + du.taunt + '\u201D');
      this.cardStats.setText(
        (stars ? 'Stars: ' + stars + '/3   Best score: ' + best + '   Best perfects: ' + perfects
          : 'Not yet defeated — ' + du.hp + ' HP, ' + du.elements.length + ' element' + (du.elements.length > 1 ? 's' : ''))
      );
      this.card.setVisible(true);
      this.card.setScale(0.9);
      this.tweens.add({ targets: this.card, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
    }
  }

  root.REPathScene = PathScene;
})(typeof window !== 'undefined' ? window : globalThis);
