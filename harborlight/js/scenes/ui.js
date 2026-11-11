/* Harborlight — shared UI helpers: storybook buttons, panels, save access. */
(function () {
  'use strict';

  var CREAM = '#F7ECD2';
  var INK = '#12233F';

  function getSave(scene) { return scene.registry.get('save'); }
  function setSave(scene, save) { scene.registry.set('save', save); }
  function persist(scene) { window.HLSave.store(getSave(scene)); }

  function text(scene, x, y, str, opts) {
    opts = opts || {};
    var t = scene.add.text(x, y, str, {
      fontFamily: opts.font || 'Georgia, "Times New Roman", serif',
      fontSize: (opts.size || 22) + 'px',
      color: opts.color || CREAM,
      fontStyle: opts.bold ? 'bold' : 'normal',
      align: opts.align || 'left',
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
      lineSpacing: opts.lineSpacing || 4
    });
    if (opts.origin != null) t.setOrigin(opts.origin);
    if (opts.shadow !== false) t.setShadow(0, 2, 'rgba(0,0,0,0.45)', 4);
    return t;
  }

  // A brass-bordered navy button. Returns a container with .setEnabled(bool)
  // and .label (the Phaser Text) for later updates.
  function button(scene, x, y, w, h, label, onTap, opts) {
    opts = opts || {};
    var fill = opts.fill != null ? opts.fill : 0x1B3358;
    var bg = scene.add.rectangle(0, 0, w, h, fill, 0.92);
    bg.setStrokeStyle(2, 0xC9A227, 0.9);
    var labelText = text(scene, 0, 0, label, {
      size: opts.size || 22, color: opts.color || CREAM, bold: true, shadow: false
    }).setOrigin(0.5);
    var c = scene.add.container(x, y, [bg, labelText]);
    c.setSize(w, h);
    c.label = labelText;
    c.bgRect = bg;
    var enabled = true;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', function () { if (enabled) bg.setFillStyle(opts.hoverFill != null ? opts.hoverFill : 0x2A4A73, 0.95); });
    bg.on('pointerout', function () { bg.setFillStyle(fill, 0.92); });
    bg.on('pointerdown', function () {
      if (!enabled) return;
      window.HLAudio.unlock();
      window.HLAudio.click();
      if (onTap) onTap();
    });
    c.setEnabled = function (on) {
      enabled = on;
      bg.setFillStyle(on ? fill : 0x3A4356, 0.92);
      labelText.setAlpha(on ? 1 : 0.55);
    };
    if (opts.disabled) c.setEnabled(false);
    return c;
  }

  // Centred modal panel (navy, brass border). Returns container; children are
  // positioned relative to the panel centre.
  function panel(scene, w, h, opts) {
    opts = opts || {};
    var g = scene.add.graphics();
    g.fillStyle(0x101F36, 0.97);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(2, 0xC9A227, 0.85);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    var c = scene.add.container(opts.x != null ? opts.x : 640, opts.y != null ? opts.y : 360, [g]);
    c.setDepth(opts.depth || 90);
    return c;
  }

  function dim(scene, depth) {
    var r = scene.add.rectangle(640, 360, 1280, 720, 0x050B16, 0.62);
    r.setDepth(depth || 80);
    return r;
  }

  function stars(n, max) {
    var s = '';
    for (var i = 0; i < (max || 3); i++) s += i < n ? '★' : '☆';
    return s;
  }

  window.HLUI = {
    CREAM: CREAM, INK: INK,
    getSave: getSave, setSave: setSave, persist: persist,
    text: text, button: button, panel: panel, dim: dim, stars: stars
  };
})();
