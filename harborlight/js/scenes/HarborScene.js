/* Harborlight — Harbor (meta) screen (SCRIPT §4.1): the town that grows,
   Cargo Bank vs Lifetime Cargo, upgrades entry, logbook entry.
   Slice 1: Fish Market (25) and Bakery (60) can be revealed; Wide Lens I sells. */
(function () {
  'use strict';
  var UI = window.HLUI;
  var DATA = window.HLData;
  var L = window.HLLogic;

  var BUILDING_TEXTURES = {
    cottage: 'bld_cottage', fishmarket: 'bld_fishmarket', bakery: 'bld_bakery'
  };

  class HarborScene extends Phaser.Scene {
    constructor() { super('Harbor'); }

    create(data) {
      var save = UI.getSave(this);
      var celebrate = (data && data.celebrate) || [];
      this.add.image(640, 360, 'sea');

      // quay band
      var g = this.add.graphics();
      g.fillStyle(0x241A12, 1);
      g.fillRect(0, 606, 1280, 114);
      g.fillStyle(0x3A2A1A, 1);
      g.fillRect(0, 606, 1280, 6);
      g.lineStyle(1, 0x000000, 0.35);
      for (var px = 40; px < 1280; px += 86) g.lineBetween(px, 612, px - 14, 720);

      // lighthouse on its point, right side
      this.add.image(1124, 618, 'lighthouse').setOrigin(0.5, 1).setScale(0.95);
      var lampGlow = this.add.image(1124, 618 - 160 * 0.95 + 60 * 0.95, 'glowDot')
        .setScale(1.9).setTint(0xFFC46B).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: lampGlow, alpha: 0.55, scale: 2.15, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.beamSprite = this.add.image(1124, 523, 'beamCone').setOrigin(0, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.65).setScale(0.55, 0.8);

      // a berthed ship or two, resting after their nights
      if (save.stats.shipsDocked > 0) {
        var rest = this.add.image(420, 586, 'ship_FB').setAlpha(0.9);
        this.tweens.add({ targets: rest, y: 589, duration: 2100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        if (save.stats.shipsDocked > 4) {
          var rest2 = this.add.image(560, 592, 'ship_CB').setAlpha(0.85);
          this.tweens.add({ targets: rest2, y: 595, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }

      /* ----- town: revealed buildings, then the next one's silhouette ----- */
      var slotX = 92;
      var baseY = 622;
      var newly = celebrate || [];
      var scene = this;
      var toast = null;
      save.buildingsRevealed.forEach(function (id) {
        var b = DATA.BUILDINGS.find(function (bb) { return bb.id === id; });
        var tex = BUILDING_TEXTURES[id] || 'bld_generic';
        var img = scene.add.image(slotX, baseY, tex).setOrigin(0.5, 1);
        if (newly.indexOf(id) !== -1) {
          img.setScale(0.2).setAlpha(0);
          scene.tweens.add({ targets: img, scale: 1, alpha: 1, duration: 900, ease: 'Back.easeOut', delay: 250 });
          window.HLAudio.harborBell();
          UI.text(scene, slotX, baseY - 108, 'New: ' + b.name + '!', { size: 18, bold: true, color: '#FFC46B' }).setOrigin(0.5);
        }
        img.setInteractive({ useHandCursor: true });
        (function (building, bx) {
          img.on('pointerdown', function () {
            window.HLAudio.unlock(); window.HLAudio.click();
            if (toast) toast.destroy();
            toast = scene.add.container(bx, baseY - 132);
            var bg = scene.add.rectangle(0, 0, 300, 54, 0x101F36, 0.94);
            bg.setStrokeStyle(1.5, 0xC9A227, 0.85);
            var tx = UI.text(scene, 0, -12, building.name, { size: 16, bold: true }).setOrigin(0.5);
            var nt = UI.text(scene, 0, 12, building.note, { size: 12.5, color: '#BFE3FF' }).setOrigin(0.5);
            toast.add([bg, tx, nt]);
            toast.setDepth(30);
            scene.tweens.add({ targets: toast, alpha: 0, delay: 2600, duration: 500, onComplete: function () { if (toast) toast.destroy(); toast = null; } });
          });
        })(b, slotX);
        slotX += 122;
      }, this);

      var next = L.nextBuilding(save);
      if (next) {
        var sil = this.add.image(slotX, baseY, 'bld_silhouette').setOrigin(0.5, 1).setAlpha(0.85);
        var away = next.at - save.lifetimeCargo;
        UI.text(this, slotX, baseY + 16, next.name, { size: 15, bold: true, color: '#BFE3FF' }).setOrigin(0.5, 0);
        UI.text(this, slotX, baseY + 38, away + ' more Cargo', { size: 13.5, color: '#7E93B5' }).setOrigin(0.5, 0);
      }

      /* ----- top bar ----- */
      var bar = this.add.rectangle(640, 30, 1280, 60, 0x0B1728, 0.82);
      bar.setDepth(10);
      this.add.image(30, 30, 'crate').setScale(1.6).setDepth(11);
      this.bankText = UI.text(this, 48, 16, 'Cargo Bank ' + save.cargoBank, { size: 20, bold: true });
      this.bankText.setDepth(11);
      UI.text(this, 48, 40, 'Lifetime Cargo ' + save.lifetimeCargo + ' — the town grows and never shrinks', { size: 14, color: '#BFE3FF' }).setDepth(11);
      var totalStars = Object.values(save.stars).reduce(function (a, b) { return a + b; }, 0);
      var starText = UI.text(this, 1252, 30, UI.stars(totalStars, DATA.NIGHTS.length * 3) + '  ' + totalStars + ' / ' + (DATA.NIGHTS.length * 3), { size: 20, color: '#FFC46B' }).setOrigin(1, 0.5);
      starText.setDepth(11);

      /* ----- actions ----- */
      var self = this;
      var y = 690;
      UI.button(this, 300, y, 190, 46, '⚓  Sail', function () { self.scene.start('NightSelect'); }, { size: 20 });
      UI.button(this, 512, y, 190, 46, 'Upgrades', function () { self.openUpgrades(); }, { size: 20 });
      UI.button(this, 724, y, 190, 46, 'Logbook', function () { self.scene.start('Logbook', { from: 'Harbor' }); }, { size: 20 });
      UI.button(this, 936, y, 190, 46, 'Menu', function () { self.scene.start('Menu'); }, { size: 20 });

      UI.text(this, 640, 648, 'Ships bring cargo → cargo builds the harbor → a better harbor brings ships home.', { size: 15, color: '#8FA8C8' }).setOrigin(0.5);
    }

    update(time) {
      if (this.beamSprite) this.beamSprite.rotation = -Math.PI / 2 + Math.sin(time / 3600) * 0.7;
    }

    /* ---------------- upgrades overlay (SCRIPT §4.4) ---------------- */
    openUpgrades() {
      var save = UI.getSave(this);
      var self = this;
      var dim = UI.dim(this, 80);
      var p = UI.panel(this, 620, 430, {});
      var def = DATA.UPGRADES.wideLens;
      var lvl = save.upgrades.wideLens || 0;

      var title = UI.text(this, 0, -178, 'Lighthouse Upgrades', { size: 28, bold: true }).setOrigin(0.5);
      p.add(title);

      // before/after beam diagram over a miniature sea
      var g = this.add.graphics();
      g.fillStyle(0x12233F, 1);
      g.fillRoundedRect(-260, -138, 520, 120, 8);
      function wedge(halfDeg, color, alpha) {
        var L2 = 190, ox = -240, oy = -78;
        var dy = L2 * Math.tan(halfDeg * Math.PI / 180);
        g.fillStyle(color, alpha);
        g.fillTriangle(ox, oy, ox + L2, oy - dy, ox + L2, oy + dy);
      }
      wedge(lvl > 0 ? def.levels[lvl - 1].halfAngleDeg : 14, 0xF5B95E, 0.30);
      if (lvl === 0) wedge(def.levels[0].halfAngleDeg, 0xFFF3C4, 0.45); // preview of what Wide Lens I adds
      g.fillStyle(0xFFC46B, 1);
      g.fillCircle(-240, -78, 5);
      p.add(g);
      var capText = lvl === 0
        ? 'Now: 28° beam  ·  Wide Lens I: 36° beam (brighter wedge)'
        : 'Fitted: 36° beam — Wide Lens I is on the lamp';
      p.add(UI.text(this, 0, 2, capText, { size: 16, color: '#BFE3FF' }).setOrigin(0.5));

      p.add(UI.text(this, -280, 44, def.name, { size: 24, bold: true }));
      p.add(UI.text(this, -280, 78, def.blurb, { size: 16.5, color: '#D8E4F5', wrap: 540, lineSpacing: 3 }));

      var bankLine = UI.text(this, -280, 138, 'Cargo Bank: ' + save.cargoBank, { size: 18, color: '#FFC46B' });
      p.add(bankLine);

      var buyBtn;
      if (lvl === 0) {
        var cost = def.levels[0].cost;
        buyBtn = UI.button(this, 120, 172, 250, 48, 'Buy Wide Lens I — ' + cost + ' ▣', function () {
          var res = L.buyUpgrade(save, 'wideLens');
          if (res.ok) {
            UI.persist(self);
            window.HLAudio.stamp();
            close();
            self.scene.restart({ celebrate: [] });
          }
        }, { size: 18 });
        if (save.cargoBank < cost) {
          buyBtn.setEnabled(false);
          p.add(UI.text(this, 120, 138, 'Need ' + (cost - save.cargoBank) + ' more Cargo', { size: 15, color: '#E4572E' }).setOrigin(0.5));
        }
        p.add(buyBtn);
      } else {
        p.add(UI.text(this, 120, 168, 'Owned ✓ — fitted to the lamp', { size: 19, bold: true, color: '#9FE8A9' }).setOrigin(0.5));
        p.add(UI.text(this, 120, 194, 'Wide Lens II arrives with the full voyage.', { size: 14, color: '#7E93B5' }).setOrigin(0.5));
      }

      var closeBtn = UI.button(this, -190, 172, 190, 48, 'Close', function () { close(); }, { size: 18 });
      p.add(closeBtn);

      function close() { p.destroy(); dim.destroy(); }
    }
  }

  window.HLHarborScene = HarborScene;
})();
