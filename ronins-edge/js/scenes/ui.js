/* Ronin's Edge — shared UI helpers: panels, buttons, bars, hearts, callouts.
   Browser global: window.REUI. */
(function (root) {
  'use strict';

  var COLORS = {
    BG: 0x141428,
    PANEL: 0x1E1E3A,
    PANEL_LIGHT: 0x2A2A4E,
    GOLD: 0xF5C542,
    CREAM: 0xF5EFE0,
    RED: 0xE63B2E,
    GREY: 0x6B6B85,
    DARK: 0x0D0D1A
  };

  var TITLE_FONT = 'Georgia, "Times New Roman", serif';
  var BODY_FONT = 'Verdana, Arial, sans-serif';

  function text(scene, x, y, str, size, color, font) {
    return scene.add.text(x, y, str, {
      fontFamily: font || BODY_FONT,
      fontSize: size + 'px',
      color: color || '#F5EFE0'
    }).setOrigin(0.5);
  }

  function titleText(scene, x, y, str, size, color) {
    var t = text(scene, x, y, str, size, color, TITLE_FONT);
    t.setFontStyle('bold');
    return t;
  }

  // Rounded-rect panel (Graphics, drawn once).
  function panel(scene, x, y, w, h, color, alpha) {
    var g = scene.add.graphics();
    g.fillStyle(color == null ? COLORS.PANEL : color, alpha == null ? 0.95 : alpha);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    g.lineStyle(2, COLORS.GOLD, 0.5);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    return g;
  }

  // Text button: container with a rounded-rect bg image + label. Press = scale pop.
  function makeButton(scene, x, y, w, h, label, cb, opts) {
    opts = opts || {};
    var c = scene.add.container(x, y);
    var bg = scene.add.image(0, 0, 'btn_bg');
    bg.setDisplaySize(w, h);
    bg.setTint(opts.color || COLORS.PANEL_LIGHT);
    bg.setInteractive({ useHandCursor: true });
    var labelText = text(scene, 0, -2, label, opts.fontSize || 24, opts.textColor || '#F5EFE0', TITLE_FONT);
    labelText.setFontStyle('bold');
    c.add([bg, labelText]);
    bg.on('pointerover', function () { bg.setTint(opts.hoverColor || 0x3A3A6E); });
    bg.on('pointerout', function () { bg.setTint(opts.color || COLORS.PANEL_LIGHT); });
    bg.on('pointerdown', function () {
      scene.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.94, duration: 60, yoyo: true });
      if (root.REAudio) root.REAudio.click();
      if (cb) cb();
    });
    c.setSize(w, h);
    return c;
  }

  // Horizontal bar: bg + fill (fill origin left, scaled by set()).
  function makeBar(scene, x, y, w, h, fillColor, bgColor) {
    var bg = scene.add.graphics();
    bg.fillStyle(bgColor == null ? 0x0D0D1A : bgColor, 0.9);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    var fill = scene.add.graphics();
    var api = {
      bg: bg, fill: fill,
      set: function (frac) {
        frac = Math.max(0, Math.min(1, frac));
        fill.clear();
        if (frac > 0) {
          fill.fillStyle(fillColor, 1);
          fill.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 2, (w - 4) * frac, h - 4, (h - 4) / 2);
        }
      },
      setColor: function (c) { fillColor = c; }
    };
    api.set(1);
    return api;
  }

  // Hearts row (heart texture). set(n) updates filled count with a pop.
  function makeHearts(scene, x, y, maxHearts) {
    var hearts = [];
    for (var i = 0; i < maxHearts; i++) {
      var h = scene.add.image(x + i * 44, y, 'heart');
      h.setDisplaySize(36, 32);
      hearts.push(h);
    }
    return {
      set: function (n) {
        for (var i = 0; i < hearts.length; i++) {
          var filled = i < n;
          hearts[i].setTint(filled ? 0xFFFFFF : 0x555566);
          hearts[i].setAlpha(filled ? 1 : 0.5);
        }
      },
      popLost: function (index, sceneRef) {
        if (index < 0 || index >= hearts.length) return;
        sceneRef.tweens.add({
          targets: hearts[index], scaleX: 1.6, scaleY: 1.6, alpha: 0.3,
          duration: 150, yoyo: true
        });
      }
    };
  }

  // Big callout text that pops in and fades ("PERFECT!", "GOOD", "FOOLED!").
  function callout(scene, x, y, str, color, size) {
    var t = titleText(scene, x, y, str, size || 54, color || '#F5C542');
    t.setScale(0.5);
    t.setAlpha(0);
    scene.tweens.add({
      targets: t, scaleX: 1, scaleY: 1, alpha: 1, duration: 120, ease: 'Back.easeOut',
      onComplete: function () {
        scene.tweens.add({ targets: t, alpha: 0, y: y - 30, duration: 500, delay: 350,
          onComplete: function () { t.destroy(); } });
      }
    });
    return t;
  }

  // Spark burst: pooled plain sprites with tweens (renderer-agnostic, no emitters).
  function sparkBurst(scene, x, y, color, count, speed) {
    count = count || 12;
    speed = speed || 260;
    for (var i = 0; i < count; i++) {
      var s = scene.add.image(x, y, 'spark');
      s.setTint(color);
      s.setDisplaySize(10 + Math.random() * 8, 10 + Math.random() * 8);
      var ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      var dist = speed * (0.4 + Math.random() * 0.8);
      scene.tweens.add({
        targets: s,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 350 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: (function (sp) { return function () { sp.destroy(); }; })(s)
      });
    }
  }

  function petalBurst(scene, x, y, count) {
    count = count || 16;
    for (var i = 0; i < count; i++) {
      var p = scene.add.image(x, y, 'petal');
      p.setTint(0xFFB7C5);
      var ang = Math.random() * Math.PI * 2;
      var dist = 60 + Math.random() * 160;
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist - 60,
        alpha: 0, rotation: Math.random() * 6,
        duration: 700 + Math.random() * 500,
        ease: 'Cubic.easeOut',
        onComplete: (function (pp) { return function () { pp.destroy(); }; })(p)
      });
    }
  }

  root.REUI = {
    COLORS: COLORS,
    TITLE_FONT: TITLE_FONT,
    BODY_FONT: BODY_FONT,
    text: text,
    titleText: titleText,
    panel: panel,
    makeButton: makeButton,
    makeBar: makeBar,
    makeHearts: makeHearts,
    callout: callout,
    sparkBurst: sparkBurst,
    petalBurst: petalBurst
  };
})(typeof window !== 'undefined' ? window : globalThis);
