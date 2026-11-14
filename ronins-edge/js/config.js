/* Ronin's Edge — shared constants (SCRIPT.md values).
   UMD: works as a browser global (window.REConfig) and in Node (module.exports). */
(function (root) {
  'use strict';

  var CONFIG = {
    FIELD_W: 1280,
    FIELD_H: 720,

    SAVE_KEY: 'ronins_edge_save_v1',
    VERSION: 'prototype-0.1',

    // Elements (SCRIPT §1.1): colour + icon, so the rule reads without colour vision.
    ELEMENTS: {
      fire:      { id: 'fire',      name: 'FIRE',      color: 0xFF5A2A, css: '#FF5A2A', key: 'ONE' },
      ice:       { id: 'ice',       name: 'ICE',       color: 0x3EC6FF, css: '#3EC6FF', key: 'TWO' },
      lightning: { id: 'lightning', name: 'LIGHTNING', color: 0xFFD23F, css: '#FFD23F', key: 'THREE' }
    },
    ELEMENT_ORDER: ['fire', 'ice', 'lightning'],

    // Combat constants (SCRIPT §1.3, §1.7)
    PERFECT_DAMAGE: 2,
    GOOD_DAMAGE: 1,
    SPECIAL_DAMAGE: 6,
    SPIRIT_PERFECT: 25,
    SPIRIT_GOOD: 10,
    SPIRIT_MULTI_BONUS: 15,
    SPIRIT_FEINT_PENALTY: 10,
    SPIRIT_MAX: 100,
    HEARTS_BASE: 3,

    // Scoring (SCRIPT §1.8)
    SCORE_PERFECT: 100,
    SCORE_GOOD: 50,
    SCORE_WIN: 250,
    SCORE_NOHIT: 250,
    HONOR_WIN: 50,
    HONOR_PER_STAR: 25,
    HONOR_PER_PERFECT: 10,
    HONOR_PER_PERFECT_CAP: 100,

    // Feint (SCRIPT §1.4): fake flash at 60% of wind-up, real flash ~450ms later.
    FEINT_FRAC: 0.6,
    FEINT_REAL_DELAY: 0.45,
    FEINT_WINDOW_MS: 120,   // |tap - feintFlash| inside this counts as "fooled"
    FEINT_WINDOW_HALF: 0.5, // window multiplier after being fooled

    // Multi-hit (SCRIPT §1.5): strikes ~450ms apart.
    MULTI_GAP: 0.45,

    // Hit-stop / slow-mo (SCRIPT §1.9, §9)
    HITSTOP_PERFECT: 0.08,
    HITSTOP_GOOD: 0.04,
    SPECIAL_SLOWMO: 0.6,
    SPECIAL_TIMESCALE: 0.25,

    // Layout (SCRIPT §1.1)
    KAITO: { x: 360, y: 400 },
    ENEMY: { x: 820, y: 380 },
    BUTTONS_Y: 615,
    BUTTON_W: 170,
    BUTTON_H: 104,
    BUTTON_GAP: 24,
    SPIRIT_BTN: { x: 640, y: 500, w: 220, h: 56 },

    // First-attack scripting (SCRIPT §2.3): slow, generous, one element.
    FIRST_ATTACK_DELAY: 1.2,   // s after fight start before first telegraph
    FIRST_TELEGRAPH: 1.1,      // s wind-up on the very first attack
    INTRO_TIME: 2.0            // s duelist intro banner
  };

  root.REConfig = CONFIG;
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
