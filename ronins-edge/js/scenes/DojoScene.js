/* Ronin's Edge — Dojo scene: sword collection + training.
   Prototype: buying works for all swords (honor-gated); equipping affects duels. */
(function (root) {
  'use strict';

  class DojoScene extends Phaser.Scene {
    constructor() { super('Dojo'); }
    create() {
      var UI = root.REUI;
      var DATA = root.REData;
      this.save = root.RESaveData || root.RESave.load();

      var g = this.add.graphics();
      g.fillGradientStyle(0x1A1A3A, 0x1A1A3A, 0x2A1A4A, 0x1A1A3A, 1);
      g.fillRect(0, 0, 1280, 720);

      UI.titleText(this, 640, 40, 'THE DOJO', 40, '#F5C542');
      this.honorText = UI.text(this, 640, 78, 'HONOR: ' + this.save.honor, 22, '#F5C542');
      var self = this;
      UI.makeButton(this, 90, 44, 140, 44, 'BACK', function () {
        self.scene.start('Path');
      }, { fontSize: 18 });

      UI.titleText(this, 640, 118, 'SWORDS', 24, '#F5EFE0');
      // Sword grid: 3 columns x 4 rows, compact cards.
      var cols = 3, cardW = 380, cardH = 96, gapX = 16, gapY = 12;
      var startX = 640 - (cols * cardW + (cols - 1) * gapX) / 2 + cardW / 2;
      var startY = 190;
      for (var i = 0; i < DATA.SWORDS.length; i++) {
        var sw = DATA.SWORDS[i];
        var cx = startX + (i % cols) * (cardW + gapX);
        var cy = startY + Math.floor(i / cols) * (cardH + gapY);
        this.swordCard(cx, cy, cardW, cardH, sw);
      }

      // Training row.
      UI.titleText(this, 640, 612, 'TRAINING', 24, '#F5EFE0');
      for (var t = 0; t < DATA.TRAINING.length; t++) {
        var tr = DATA.TRAINING[t];
        var tx = 640 - 3 * 160 + t * 320 + 80;
        this.trainingCard(tx, 668, 300, 56, tr);
      }
      this.msgText = UI.text(this, 640, 706, '', 16, '#E63B2E');
    }

    refreshHonor() {
      this.honorText.setText('HONOR: ' + this.save.honor);
    }

    showMsg(str, color) {
      this.msgText.setText(str);
      this.msgText.setColor(color || '#E63B2E');
      var self = this;
      this.time.delayedCall(2500, function () { self.msgText.setText(''); });
    }

    swordCard(x, y, w, h, sw) {
      var UI = root.REUI;
      var DATA = root.REData;
      var self = this;
      var c = this.add.container(x, y);
      var bg = this.add.image(0, 0, 'btn_bg');
      bg.setDisplaySize(w, h);
      var owned = this.save.swords.indexOf(sw.id) !== -1;
      var equipped = this.save.equipped === sw.id;
      var locked = sw.requiresDuel12 && !(this.save.stars['12']);
      bg.setTint(equipped ? 0x8A6D3B : (owned ? 0x2A2A4E : 0x1E1E3A));
      bg.setInteractive({ useHandCursor: true });
      var name = UI.titleText(this, -w / 2 + 16, -26, sw.name, 20, equipped ? '#F5C542' : '#F5EFE0');
      name.setOrigin(0, 0.5);
      var perk = UI.text(this, -w / 2 + 16, 2, sw.perk, 15, '#BFBFBF');
      perk.setOrigin(0, 0.5);
      perk.setWordWrapWidth(w - 32);
      var state = UI.text(this, -w / 2 + 16, 30,
        locked ? 'LOCKED — beat Duel 12' : (equipped ? 'EQUIPPED' : (owned ? 'OWNED — tap to equip' : sw.cost + ' honor — tap to buy')),
        15, locked ? '#6B6B85' : (equipped ? '#F5C542' : '#8AC48A'));
      state.setOrigin(0, 0.5);
      c.add([bg, name, perk, state]);
      bg.on('pointerdown', function () {
        if (locked) { self.showMsg('The Sun Blade is earned by beating Master Kurogane (Duel 12).'); return; }
        if (!owned) {
          if (root.RESave.buySword(self.save, sw.id, sw.cost)) {
            root.RESave.save(self.save);
            root.RESaveData = self.save;
            self.refreshHonor();
            self.scene.restart();
          } else {
            self.showMsg('Not enough honor — win duels to earn more.');
          }
          return;
        }
        if (!equipped) {
          self.save.equipped = sw.id;
          root.RESave.save(self.save);
          root.RESaveData = self.save;
          self.scene.restart();
        }
      });
    }

    trainingCard(x, y, w, h, tr) {
      var UI = root.REUI;
      var self = this;
      var c = this.add.container(x, y);
      var bg = this.add.image(0, 0, 'btn_bg');
      bg.setDisplaySize(w, h);
      var owned = this.save.training.indexOf(tr.id) !== -1;
      bg.setTint(owned ? 0x8A6D3B : 0x1E1E3A);
      bg.setInteractive({ useHandCursor: true });
      var name = UI.titleText(this, 0, -12, tr.name + (owned ? ' ✓' : ''), 17, owned ? '#F5C542' : '#F5EFE0');
      var perk = UI.text(this, 0, 12, owned ? tr.perk : tr.perk + ' — ' + tr.cost + ' honor', 13, '#BFBFBF');
      c.add([bg, name, perk]);
      bg.on('pointerdown', function () {
        if (owned) return;
        if (root.RESave.buyTraining(self.save, tr.id, tr.cost)) {
          root.RESave.save(self.save);
          root.RESaveData = self.save;
          self.refreshHonor();
          self.scene.restart();
        } else {
          self.showMsg('Not enough honor — win duels to earn more.');
        }
      });
    }
  }

  root.REDojoScene = DojoScene;
})(typeof window !== 'undefined' ? window : globalThis);
