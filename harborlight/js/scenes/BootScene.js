/* Harborlight — Boot: loads the save, bakes every procedural texture, then Menu.
   All art is drawn in code (SCRIPT §8.3): no image files, no sprite sheets. */
(function () {
  'use strict';
  var CFG = window.HLConfig;
  var DATA = window.HLData;
  var P = CFG.PALETTE;

  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    create() {
      var save = window.HLSave.load();
      this.registry.set('save', save);
      window.HLAudio.applySettings(save.settings);

      this.add.rectangle(640, 360, 1280, 720, 0x0D1A2E);
      var t = window.HLUI.text(this, 640, 320, 'HARBORLIGHT', { size: 44, bold: true }).setOrigin(0.5);
      t.setAlpha(0.9);
      window.HLUI.text(this, 640, 372, 'Lighting the lamp…', { size: 20, color: '#C9A227' }).setOrigin(0.5);
      var barBg = this.add.rectangle(640, 420, 320, 8, 0x1B3358);
      var bar = this.add.rectangle(640 - 158, 420, 4, 6, 0xFFC46B).setOrigin(0, 0.5);
      barBg.setDepth(1); bar.setDepth(2);
      this.tweens.add({ targets: bar, width: 316, duration: 420, ease: 'Quad.easeOut' });

      this.bakeTextures();

      this.time.delayedCall(460, function () { this.scene.start('Menu'); }, [], this);
    }

    /* ---------------- texture baking ---------------- */
    bakeTextures() {
      this.bakeSea();
      this.bakeBeam();
      this.bakeGlow();
      this.bakeShips();
      this.bakeScenery();
      this.bakeBuildings();
      this.bakeSmall();
    }

    bakeSea() {
      var g = this.add.graphics();
      g.fillGradientStyle(P.midWater, P.midWater, P.deepWater, P.deepWater, 1);
      g.fillRect(0, 0, 1280, 720);
      // horizon sky band glow at the bottom of the sea (the harbor side)
      g.fillGradientStyle(0x24365E, 0x24365E, 0x24365E, 0x24365E, 0);
      g.fillRect(0, 560, 1280, 160);
      // gentle depth bands
      for (var i = 0; i < 7; i++) {
        g.fillStyle(0xFFFFFF, 0.016);
        g.fillRect(0, 60 + i * 90, 1280, 26);
      }
      // moon-glitter path
      for (var m = 0; m < 90; m++) {
        var mx = 640 + (Math.random() - 0.5) * 260;
        var my = 40 + Math.random() * 480;
        g.fillStyle(P.sparkle, 0.03 + Math.random() * 0.06);
        g.fillEllipse(mx, my, 8 + Math.random() * 26, 2 + Math.random() * 3);
      }
      // scattered sparkle
      for (var s = 0; s < 500; s++) {
        g.fillStyle(P.sparkle, 0.02 + Math.random() * 0.07);
        g.fillCircle(Math.random() * 1280, Math.random() * 720, Math.random() < 0.85 ? 1 : 2);
      }
      g.generateTexture('sea', 1280, 720);
      g.destroy();
    }

    bakeBeam() {
      // Layered cone, origin at the lamp (left-centre). Widest layer ~26 degrees
      // half-angle of pure atmosphere; the bright core sits inside it.
      var g = this.add.graphics();
      var L = 760, CY = 220;
      function wedge(halfDeg, color, alpha) {
        var dy = L * Math.tan(halfDeg * Math.PI / 180);
        g.fillStyle(color, alpha);
        g.fillTriangle(0, CY, L, CY - dy, L, CY + dy);
      }
      wedge(26, P.beamFalloff, 0.05);
      wedge(19, P.beamFalloff, 0.06);
      wedge(14, P.beamFalloff, 0.09);
      wedge(9, P.beamCore, 0.13);
      wedge(4.5, P.beamCore, 0.17);
      // bright root near the lamp
      g.fillStyle(P.beamCore, 0.20);
      g.fillCircle(6, CY, 26);
      g.generateTexture('beamCone', L, CY * 2);
      g.destroy();
    }

    bakeGlow() {
      var g = this.add.graphics();
      for (var i = 8; i >= 1; i--) {
        g.fillStyle(0xFFFFFF, 0.05);
        g.fillCircle(32, 32, i * 4);
      }
      g.fillStyle(0xFFFFFF, 0.5);
      g.fillCircle(32, 32, 3.5);
      g.generateTexture('glowDot', 64, 64);
      g.destroy();
    }

    shipBase(g, def, cx, cy) {
      var L = def.w, W = def.h;
      // top-down hull, bow pointing +x (east)
      g.fillStyle(def.hull, 1);
      g.fillPoints([
        { x: cx - L / 2, y: cy - W * 0.30 },
        { x: cx + L * 0.08, y: cy - W / 2 },
        { x: cx + L / 2, y: cy },
        { x: cx + L * 0.08, y: cy + W / 2 },
        { x: cx - L / 2, y: cy + W * 0.30 }
      ], true);
      // rim light along the top edge (moonlit readability, SCRIPT §5.1)
      g.lineStyle(2, 0xBFE3FF, 0.55);
      g.beginPath();
      g.moveTo(cx - L / 2, cy - W * 0.30);
      g.lineTo(cx + L * 0.08, cy - W / 2 + 1);
      g.lineTo(cx + L / 2, cy);
      g.strokePath();
      // deck
      g.fillStyle(0x000000, 0.18);
      g.fillRect(cx - L * 0.34, cy - W * 0.26, L * 0.62, W * 0.52);
    }

    bakeShips() {
      var self = this;
      Object.keys(DATA.SHIP_TYPES).forEach(function (id) {
        var def = DATA.SHIP_TYPES[id];
        var pad = 16;
        var W = def.w + pad * 2, H = def.h + pad * 2;
        var cx = W / 2, cy = H / 2;
        var g = self.add.graphics();
        self.shipBase(g, def, cx, cy);
        if (id === 'FB') {
          g.fillStyle(0xF7ECD2, 0.95); // cream sail, stylised top-down
          g.fillTriangle(cx - 2, cy - def.h * 0.42, cx - 2, cy + def.h * 0.42, cx + def.w * 0.22, cy);
          g.fillStyle(0x3A2A18, 1);
          g.fillCircle(cx - 2, cy, 3);
          g.fillRect(cx - def.w * 0.40, cy - 5, 12, 10); // cabin aft
        } else if (id === 'CB') {
          g.fillStyle(0x2E1F10, 1);
          g.fillCircle(cx - def.w * 0.12, cy, 3);
          g.fillCircle(cx + def.w * 0.18, cy, 3);
          g.fillStyle(def.accent, 0.85); // cargo hatches
          [-0.26, 0.0, 0.26].forEach(function (f) {
            g.fillRect(cx + def.w * f - 6, cy - def.h * 0.20, 12, def.h * 0.40);
          });
        } else if (id === 'MC') {
          g.fillStyle(0xEAF6FF, 0.9); // slim pale sails
          [-0.24, 0.02, 0.28].forEach(function (f) {
            g.fillTriangle(cx + def.w * f, cy - def.h * 0.40, cx + def.w * f, cy + def.h * 0.40, cx + def.w * f + 10, cy);
          });
          g.fillStyle(0x14222E, 1);
          g.fillRect(cx - def.w * 0.42, cy - 4, 10, 8);
        } else if (id === 'TK') {
          g.fillStyle(0x6B7280, 0.9); // long deck stripe
          g.fillRect(cx - def.w * 0.40, cy - 4, def.w * 0.78, 8);
          g.fillStyle(0x22262E, 1);
          g.fillCircle(cx - def.w * 0.36, cy, 6); // funnel aft
          g.fillStyle(0xFF5147, 1); g.fillCircle(cx + def.w * 0.30, cy - def.h * 0.30, 2.5); // running lights
          g.fillStyle(0x51FF7A, 1); g.fillCircle(cx + def.w * 0.30, cy + def.h * 0.30, 2.5);
        }
        g.generateTexture('ship_' + id, W, H);
        g.destroy();
      });
    }

    bakeScenery() {
      // lighthouse: 110x160, lamp room centre 60px from the top
      var g = this.add.graphics();
      g.fillStyle(0x0B1526, 1); // rocky point
      g.fillEllipse(55, 148, 108, 26);
      g.fillStyle(0x1C2C47, 1);
      g.fillEllipse(55, 142, 84, 20);
      // tapered tower, cream with red bands
      g.fillStyle(0xF7ECD2, 1);
      g.fillPoints([
        { x: 40, y: 140 }, { x: 47, y: 74 }, { x: 63, y: 74 }, { x: 70, y: 140 }
      ], true);
      g.fillStyle(0xC0452F, 1);
      g.fillRect(44.5, 108, 21, 12);
      g.fillRect(42.5, 82, 25, 10);
      // gallery + lamp room
      g.fillStyle(0x2A2A33, 1);
      g.fillRect(42, 66, 26, 8);
      g.fillStyle(0xFFC46B, 1);
      g.fillRect(48, 50, 14, 16);
      g.fillStyle(0x2A2A33, 1);
      g.fillTriangle(44, 50, 66, 50, 55, 38);
      g.generateTexture('lighthouse', 110, 160);
      g.destroy();

      // rock with foam flecks
      g = this.add.graphics();
      g.fillStyle(0x4A4238, 1);
      g.fillPoints([
        { x: 8, y: 52 }, { x: 22, y: 26 }, { x: 48, y: 12 }, { x: 74, y: 22 },
        { x: 86, y: 48 }, { x: 70, y: 66 }, { x: 34, y: 70 }, { x: 12, y: 62 }
      ], true);
      g.fillStyle(0x6B5F4E, 1);
      g.fillPoints([
        { x: 26, y: 40 }, { x: 44, y: 20 }, { x: 64, y: 28 }, { x: 56, y: 48 }, { x: 34, y: 50 }
      ], true);
      g.fillStyle(0xBFE3FF, 0.5);
      g.fillEllipse(20, 62, 14, 4); g.fillEllipse(72, 60, 16, 4); g.fillEllipse(48, 70, 12, 3);
      g.generateTexture('rock', 94, 76);
      g.destroy();

      // foam ring (honest scrape boundary, SCRIPT §8.3)
      g = this.add.graphics();
      g.lineStyle(3, 0xBFE3FF, 0.55);
      for (var a = 0; a < 12; a++) {
        var a0 = a * Math.PI / 6 + 0.10, a1 = a * Math.PI / 6 + Math.PI / 6 - 0.10;
        g.beginPath();
        g.arc(50, 50, 45, a0, a1, false);
        g.strokePath();
      }
      g.generateTexture('foamRing', 100, 100);
      g.destroy();

      // gate buoy
      g = this.add.graphics();
      g.fillStyle(0x274435, 1);
      g.fillRect(6, 12, 10, 10);
      g.fillStyle(0x51FF7A, 1);
      g.fillCircle(11, 8, 4);
      g.generateTexture('buoy', 22, 24);
      g.destroy();
    }

    bakeBuildings() {
      var self = this;
      function house(key, w, h, body, roof, extra) {
        var g = self.add.graphics();
        g.fillStyle(body, 1);
        g.fillRect(8, h * 0.38, w - 16, h * 0.58);
        g.fillStyle(roof, 1);
        g.fillTriangle(2, h * 0.40, w - 2, h * 0.40, w / 2, 4);
        g.fillStyle(0xFFC46B, 1); // warm windows
        g.fillRect(w * 0.24, h * 0.55, 9, 11);
        g.fillRect(w * 0.62, h * 0.55, 9, 11);
        g.fillStyle(0x3A2A18, 1); // door
        g.fillRect(w / 2 - 6, h * 0.62, 12, h * 0.34);
        if (extra) extra(g, w, h);
        g.generateTexture(key, w, h);
        g.destroy();
      }
      house('bld_cottage', 92, 82, 0xE8D9B8, 0x9A4A30);
      house('bld_bakery', 96, 92, 0xEFE0BC, 0x7A4A8C, function (g, w, h) {
        g.fillStyle(0x8A8A92, 1); g.fillRect(w - 26, 8, 10, 22); // chimney
      });
      // fish market: open stall, striped awning
      var g = this.add.graphics();
      g.fillStyle(0xC9A227, 1);
      g.fillRect(10, 44, 92, 30);
      for (var i = 0; i < 6; i++) {
        g.fillStyle(i % 2 ? 0xC0452F : 0xF7ECD2, 1);
        g.fillTriangle(4 + i * 17, 44, 21 + i * 17, 44, 12 + i * 17, 26);
      }
      g.fillStyle(0x5C3A21, 1);
      g.fillRect(14, 56, 84, 6);
      g.fillStyle(0x9ADBE8, 1); // the catch
      g.fillEllipse(34, 52, 16, 6); g.fillEllipse(62, 52, 16, 6); g.fillEllipse(84, 52, 14, 6);
      g.generateTexture('bld_fishmarket', 112, 78);
      g.destroy();
      house('bld_generic', 92, 86, 0xDCCBA4, 0x5C6B8C);
      // silhouette for the next locked building
      g = this.add.graphics();
      g.fillStyle(0x0A1626, 0.88);
      g.fillRect(8, 34, 76, 48);
      g.fillTriangle(2, 36, 90, 36, 46, 6);
      g.lineStyle(2, 0xC9A227, 0.5);
      g.strokeRect(8, 34, 76, 48);
      g.generateTexture('bld_silhouette', 92, 86);
      g.destroy();
    }

    bakeSmall() {
      var g = this.add.graphics();
      // crate
      g.fillStyle(0x9A6A34, 1); g.fillRect(0, 0, 12, 12);
      g.lineStyle(2, 0x6E4A20, 1); g.strokeRect(1, 1, 10, 10);
      g.beginPath(); g.moveTo(1, 1); g.lineTo(11, 11); g.moveTo(11, 1); g.lineTo(1, 11); g.strokePath();
      g.generateTexture('crate', 12, 12);
      g.destroy();
      // 4-point sparkle
      g = this.add.graphics();
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillPoints([
        { x: 7, y: 0 }, { x: 9, y: 5 }, { x: 14, y: 7 }, { x: 9, y: 9 },
        { x: 7, y: 14 }, { x: 5, y: 9 }, { x: 0, y: 7 }, { x: 5, y: 5 }
      ], true);
      g.generateTexture('spark', 14, 14);
      g.destroy();
      // soft foam puff for wakes
      g = this.add.graphics();
      for (var i = 4; i >= 1; i--) { g.fillStyle(0xBFE3FF, 0.10); g.fillCircle(9, 9, i * 2.2); }
      g.generateTexture('foam', 18, 18);
      g.destroy();
      // spawn chevron
      g = this.add.graphics();
      g.fillStyle(0xF7ECD2, 0.95);
      g.fillTriangle(2, 3, 24, 13, 2, 23);
      g.fillTriangle(10, 3, 30, 13, 10, 23);
      g.generateTexture('chev', 32, 26);
      g.destroy();
      // expanding ring (bump splash)
      g = this.add.graphics();
      g.lineStyle(3, 0xBFE3FF, 0.8);
      g.strokeCircle(30, 30, 27);
      g.generateTexture('ring', 60, 60);
      g.destroy();
    }
  }

  window.HLBootScene = BootScene;
})();
