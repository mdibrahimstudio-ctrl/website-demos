/* Ronin's Edge — Boot scene: generates every texture from code (no external
   art), loads the save, then starts the Menu (or Duel 1 directly in ?smoke mode). */
(function (root) {
  'use strict';

  function starPoints(cx, cy, outer, inner, points) {
    var pts = [];
    for (var i = 0; i < points * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = -Math.PI / 2 + i * Math.PI / points;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
      var CFG = root.REConfig;
      var DATA = root.REData;
      var g = this.add.graphics();

      /* ---------- Kaito (back view, 130x190) ----------
         Robed figure: head + wide straw hat connected to shoulders, torso,
         then a flared robe skirt. (v1 was a bare triangle + floating hat —
         it read as a volcano with a UFO. Fixed after visual QA 2026-11-14.) */
      g.clear();
      g.fillStyle(0x1A1A2E, 1); // back of head (dark hair)
      g.fillCircle(65, 52, 15);
      g.fillStyle(0x2A2A4A, 1); // shoulders / torso
      g.fillRoundedRect(28, 62, 74, 72, 14);
      g.fillStyle(0x2A2A4A, 1); // robe skirt (trapezoid)
      g.fillPoints([{ x: 30, y: 128 }, { x: 100, y: 128 }, { x: 114, y: 186 }, { x: 16, y: 186 }], true);
      g.fillStyle(0x1D1D33, 1); // belt
      g.fillRect(30, 120, 70, 9);
      g.fillStyle(0x3A3A5E, 1); // robe centre fold
      g.fillRect(62, 70, 6, 112);
      g.fillStyle(0xC9A86A, 1); // straw hat (overlaps the head top)
      g.fillEllipse(65, 46, 116, 26);
      g.fillStyle(0x8A6D3B, 1);
      g.fillEllipse(65, 41, 62, 13);
      g.fillStyle(0x8A8A9A, 1); // sword hilt at hip
      g.fillRect(98, 106, 26, 6);
      g.generateTexture('kaito', 130, 190);

      /* ---------- Enemy bodies (150x210, one per duelist) ---------- */
      for (var d = 0; d < DATA.DUELISTS.length; d++) {
        var du = DATA.DUELISTS[d];
        g.clear();
        g.fillStyle(du.robe, 1); // shoulders / torso
        g.fillRoundedRect(42, 58, 66, 46, 12);
        g.fillStyle(du.robe, 1); // robe skirt (trapezoid)
        g.fillPoints([{ x: 44, y: 98 }, { x: 106, y: 98 }, { x: 132, y: 205 }, { x: 18, y: 205 }], true);
        g.fillStyle(0xF5C542, 1); // sash
        g.fillRect(38, 128, 74, 10);
        g.fillStyle(0xE8C39A, 1); // head
        g.fillCircle(75, 42, 26);
        g.fillStyle(0x1A1A1A, 1); // topknot
        g.fillCircle(75, 16, 9);
        g.fillStyle(du.accent, 1); // headband
        g.fillRect(50, 30, 50, 7);
        g.fillStyle(0x1A1A1A, 1); // eyes
        g.fillCircle(66, 44, 3);
        g.fillCircle(84, 44, 3);
        g.generateTexture('enemy_' + du.id, 150, 210);
      }

      /* ---------- Blade (24x150, origin set at use) ---------- */
      g.clear();
      g.fillStyle(0xE8E8F0, 1);
      g.fillTriangle(12, 2, 3, 130, 21, 130);
      g.fillStyle(0xB8B8CC, 1);
      g.fillTriangle(12, 2, 12, 130, 21, 130);
      g.fillStyle(0x2A2A2A, 1);
      g.fillRect(8, 130, 8, 20); // handle
      g.generateTexture('blade', 24, 150);

      /* ---------- Element icons (64x64) ---------- */
      // Fire: red-orange flame (circle + tip triangle) with yellow core.
      g.clear();
      g.fillStyle(0xFF5A2A, 1);
      g.fillCircle(32, 40, 20);
      g.fillTriangle(14, 42, 32, 6, 50, 42);
      g.fillStyle(0xFFD23F, 1);
      g.fillCircle(32, 42, 10);
      g.fillTriangle(24, 42, 32, 24, 40, 42);
      g.generateTexture('icon_fire', 64, 64);
      // Ice: cyan 6-arm snowflake.
      g.clear();
      g.lineStyle(5, 0x3EC6FF, 1);
      for (var a = 0; a < 6; a++) {
        var ang = a * Math.PI / 3;
        g.lineBetween(32, 32, 32 + Math.cos(ang) * 24, 32 + Math.sin(ang) * 24);
      }
      g.fillStyle(0xBFEFFF, 1);
      g.fillCircle(32, 32, 6);
      g.generateTexture('icon_ice', 64, 64);
      // Lightning: yellow zigzag bolt.
      g.clear();
      g.fillStyle(0xFFD23F, 1);
      g.fillPoints([
        { x: 38, y: 4 }, { x: 16, y: 36 }, { x: 28, y: 36 },
        { x: 24, y: 60 }, { x: 48, y: 26 }, { x: 34, y: 26 }
      ], true);
      g.generateTexture('icon_bolt', 64, 64);

      /* ---------- Small sprites ---------- */
      g.clear();
      g.fillStyle(0xFFFFFF, 1);
      g.fillCircle(8, 8, 7);
      g.generateTexture('spark', 16, 16);

      g.clear();
      g.fillStyle(0xFFB7C5, 1);
      g.fillEllipse(8, 6, 15, 10);
      g.generateTexture('petal', 16, 12);

      // Heart (36x32): two circles + triangle.
      g.clear();
      g.fillStyle(0xE63B2E, 1);
      g.fillCircle(11, 10, 9);
      g.fillCircle(25, 10, 9);
      g.fillTriangle(3, 14, 33, 14, 18, 31);
      g.generateTexture('heart', 36, 32);

      // Star (40x40).
      g.clear();
      g.fillStyle(0xF5C542, 1);
      g.fillPoints(starPoints(20, 20, 18, 8, 5), true);
      g.generateTexture('star', 40, 40);

      // Lock (40x48).
      g.clear();
      g.lineStyle(5, 0x8A8A9A, 1);
      g.strokeCircle(20, 18, 10);
      g.fillStyle(0x8A8A9A, 1);
      g.fillRoundedRect(8, 20, 24, 24, 4);
      g.generateTexture('lock', 40, 48);

      /* ---------- Buttons ---------- */
      g.clear();
      g.fillStyle(0x2A2A4E, 1);
      g.fillRoundedRect(2, 2, 166, 100, 18);
      g.lineStyle(3, 0xF5C542, 0.7);
      g.strokeRoundedRect(2, 2, 166, 100, 18);
      g.generateTexture('btn_bg', 170, 104);

      g.clear();
      g.lineStyle(5, 0xFFFFFF, 1);
      g.strokeRoundedRect(3, 3, 172, 106, 20);
      g.generateTexture('btn_ring', 178, 112);

      // Slash streak (320x80): white crescent band.
      g.clear();
      g.fillStyle(0xFFFFFF, 1);
      var slashPts = [];
      for (var i = 0; i <= 10; i++) {
        var t = i / 10;
        slashPts.push({ x: 20 + t * 280, y: 58 - Math.sin(t * Math.PI) * 30 - t * 18 });
      }
      for (var j = 10; j >= 0; j--) {
        var t2 = j / 10;
        slashPts.push({ x: 20 + t2 * 280, y: 66 - Math.sin(t2 * Math.PI) * 30 - t2 * 18 });
      }
      g.fillPoints(slashPts, true);
      g.generateTexture('slash', 320, 80);

      // Glow (128x128): concentric circles, fading outward.
      g.clear();
      for (var r = 64; r > 0; r -= 8) {
        g.fillStyle(0xFFFFFF, 0.06 + (1 - r / 64) * 0.12);
        g.fillCircle(64, 64, r);
      }
      g.generateTexture('glow', 128, 128);

      g.destroy();

      // Load save + apply sound setting.
      var save = root.RESave.load();
      root.RESaveData = save;
      if (root.REAudio) root.REAudio.setMuted(!save.sound);

      // Smoke mode: jump straight into Duel 1 with the auto-driver.
      var smoke = false;
      try { smoke = (window.location.search || '').indexOf('smoke') !== -1; } catch (e) {}
      if (smoke) {
        this.scene.start('Duel', { duelistId: 1, smoke: true });
      } else {
        this.scene.start('Menu');
      }
    }
  }

  root.REBootScene = BootScene;
})(typeof window !== 'undefined' ? window : globalThis);
