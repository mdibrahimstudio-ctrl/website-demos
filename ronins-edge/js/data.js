/* Ronin's Edge — game data: the 12 duelists, 12 swords, training, hints.
   All values from SCRIPT.md §3.2, §4.2, §4.3.
   UMD: browser global (window.REData) and Node. */
(function (root) {
  'use strict';

  /* ---------------- Duelists (SCRIPT §3.2) ----------------
     interval: flash-to-flash seconds, [start, end] — tightens as enemy HP falls.
     telegraph: wind-up seconds (flash is at telegraph end).
     perfect/good: parry windows in ms.
     feint: null | { firstAtHpFrac, chance } | { every } — see logic.js.
     multi: null | { fromHpFrac, chance, strikes: [2,3] }.
     elements: the pool the duelist attacks with. */
  var DUELISTS = [
    {
      id: 1, name: 'Ash', title: 'the Gatekeeper',
      taunt: 'No one climbs past the gate. Least of all a pup like you.',
      elements: ['fire'], hp: 10,
      interval: [2.2, 1.8], telegraph: 0.9,
      perfectMs: 160, goodMs: 380,
      feint: null, multi: null,
      robe: 0x8A2F1D, accent: 0xFF5A2A, season: 'base'
    },
    {
      id: 2, name: 'Yuki', title: 'the Frost Fencer',
      taunt: 'Fire is honest. Ice... ice lies. Watch closely, little ronin.',
      elements: ['ice'], hp: 12,
      interval: [1.9, 1.5], telegraph: 0.85,
      perfectMs: 150, goodMs: 350,
      feint: { firstAtHpFrac: 0.6, chance: 0.25 }, multi: null,
      robe: 0x1D4A6B, accent: 0x3EC6FF, season: 'base'
    },
    {
      id: 3, name: 'Volt', title: 'the Storm Blade',
      taunt: 'By the time you see the flash, you are already cut.',
      elements: ['lightning'], hp: 12,
      interval: [1.6, 1.3], telegraph: 0.7,
      perfectMs: 140, goodMs: 330,
      feint: { firstAtHpFrac: 0.75, chance: 0.2 }, multi: null,
      robe: 0x4A3A12, accent: 0xFFD23F, season: 'base'
    },
    {
      id: 4, name: 'The Ember Twins', title: 'Fire and Ice, One Blade',
      taunt: 'Two of us. One of you. The maths is not in your favour.',
      elements: ['fire', 'ice'], hp: 14,
      interval: [1.7, 1.4], telegraph: 0.8,
      perfectMs: 140, goodMs: 320,
      feint: { firstAtHpFrac: 0.8, chance: 0.2 }, multi: null,
      alternate: true, // elements alternate predictably
      robe: 0x5A1D3A, accent: 0xFF5A2A, season: 'base'
    },
    {
      id: 5, name: 'The Tempest', title: 'the Howling Blade',
      taunt: 'The storm does not telegraph its punches. Neither do I.',
      elements: ['lightning'], hp: 14,
      interval: [1.5, 1.2], telegraph: 0.7,
      perfectMs: 130, goodMs: 300,
      feint: { every: 3 }, multi: null,
      robe: 0x2A2A4A, accent: 0xFFD23F, season: 'mid'
    },
    {
      id: 6, name: 'Crimson Oni', title: 'the Demon of the Pass',
      taunt: 'One parry? Cute. Try parrying THREE.',
      elements: ['fire'], hp: 18,
      interval: [1.8, 1.5], telegraph: 0.85,
      perfectMs: 130, goodMs: 300,
      feint: { firstAtHpFrac: 0.8, chance: 0.2 },
      multi: { fromHpFrac: 0.7, chance: 0.3, strikes: [2, 2] },
      robe: 0x6B1D1D, accent: 0xFF5A2A, season: 'mid'
    },
    {
      id: 7, name: 'Frost Warden', title: 'Keeper of the Frozen Gate',
      taunt: 'The cold is patient. I am patient. You are not.',
      elements: ['ice'], hp: 18,
      interval: [1.7, 1.4], telegraph: 0.95,
      perfectMs: 120, goodMs: 280,
      feint: { every: 4 },
      multi: { fromHpFrac: 0.75, chance: 0.35, strikes: [2, 3] },
      robe: 0x123A4A, accent: 0x3EC6FF, season: 'mid'
    },
    {
      id: 8, name: 'Storm Herald', title: 'Voice of the Thunder',
      taunt: 'Thunder is just lightning, bragging. Listen for it.',
      elements: ['lightning'], hp: 20,
      interval: [1.4, 1.1], telegraph: 0.6,
      perfectMs: 120, goodMs: 270,
      feint: { every: 2 },
      multi: { fromHpFrac: 0.8, chance: 0.3, strikes: [2, 3] },
      robe: 0x3A2A5A, accent: 0xFFD23F, season: 'mid'
    },
    {
      id: 9, name: 'The Threefold Master', title: 'Flame, Frost, and Storm',
      taunt: 'You have learned one element at a time. Now learn all three at once.',
      elements: ['fire', 'ice', 'lightning'], hp: 22,
      interval: [1.6, 1.3], telegraph: 0.75,
      perfectMs: 115, goodMs: 260,
      feint: { every: 3 },
      multi: { fromHpFrac: 0.8, chance: 0.3, strikes: [2, 3] },
      robe: 0x1D3A2A, accent: 0xF5C542, season: 'summit'
    },
    {
      id: 10, name: 'Iron Shogun', title: 'the Unbroken Wall',
      taunt: 'I have dueled ten thousand ronin. You are number ten thousand and one.',
      elements: ['fire', 'ice', 'lightning'], hp: 26,
      interval: [1.5, 1.2], telegraph: 0.7,
      perfectMs: 110, goodMs: 240,
      feint: { every: 3 },
      multi: { fromHpFrac: 0.85, chance: 0.4, strikes: [2, 3] },
      robe: 0x333333, accent: 0xC0C0C0, season: 'summit'
    },
    {
      id: 11, name: 'The Pale Duelist', title: 'the One Without a Shadow',
      taunt: '...',
      elements: ['fire', 'ice', 'lightning'], hp: 28,
      interval: [1.3, 1.0], telegraph: 0.6,
      perfectMs: 105, goodMs: 230,
      feint: { every: 2 },
      multi: { fromHpFrac: 0.9, chance: 0.45, strikes: [2, 3] },
      robe: 0x5A5A6B, accent: 0xFFFFFF, season: 'summit'
    },
    {
      id: 12, name: 'Master Kurogane', title: 'Lord of the Iron Mountain',
      taunt: 'So. The pup climbed the whole mountain. Then the mountain will answer.',
      elements: ['fire', 'ice', 'lightning'], hp: 34,
      interval: [1.4, 1.0], telegraph: 0.65,
      perfectMs: 100, goodMs: 220,
      feint: { every: 2 },
      multi: { fromHpFrac: 0.9, chance: 0.5, strikes: [2, 3] },
      enrageAtHpFrac: 0.5, enrageSpeed: 1.25,
      robe: 0x1A1A2E, accent: 0xF5C542, season: 'summit'
    }
  ];

  /* ---------------- Swords (SCRIPT §4.2) ---------------- */
  var SWORDS = [
    { id: 'training', name: 'Training Katana', element: null, perk: 'None — the blade every ronin starts with.', cost: 0 },
    { id: 'ember', name: 'Ember Fang', element: 'fire', perk: 'Fire parry window +20 ms', cost: 150, windowBonus: { fire: 20 } },
    { id: 'glacier', name: 'Glacier Edge', element: 'ice', perk: 'Ice parry window +20 ms', cost: 150, windowBonus: { ice: 20 } },
    { id: 'stormcaller', name: 'Stormcaller', element: 'lightning', perk: 'Lightning parry window +20 ms', cost: 150, windowBonus: { lightning: 20 } },
    { id: 'dawn', name: 'Dawn Blade', element: 'fire', perk: 'Perfect parries build +5 Spirit', cost: 300, spiritBonus: 5 },
    { id: 'moonlit', name: 'Moonlit Tachi', element: 'ice', perk: 'Start each duel with +20 Spirit', cost: 300, startSpirit: 20 },
    { id: 'thunderclap', name: 'Thunderclap', element: 'lightning', perk: 'Counter damage +1 on Perfect', cost: 400, perfectDamageBonus: 1 },
    { id: 'crimson', name: 'Crimson Oath', element: 'fire', perk: 'Special deals +3 damage', cost: 400, specialDamageBonus: 3 },
    { id: 'winters', name: "Winter's Vow", element: 'ice', perk: 'Feint-fool penalty halved', cost: 400, feintHalf: true },
    { id: 'skyrender', name: 'Skyrender', element: 'lightning', perk: 'Combo never resets on a Good parry', cost: 500 },
    { id: 'dragons', name: "Dragon's Breath", element: 'fire', perk: '+1 heart (4 total)', cost: 600, heartsBonus: 1 },
    { id: 'sunblade', name: 'The Sun Blade', element: 'all', perk: 'All windows +15 ms, +1 heart', cost: 1000, windowBonus: { fire: 15, ice: 15, lightning: 15 }, heartsBonus: 1, requiresDuel12: true }
  ];

  /* ---------------- Training (SCRIPT §4.3) ---------------- */
  var TRAINING = [
    { id: 'grip', name: 'Iron Grip', perk: 'All parry windows +10 ms', cost: 200, windowBonusAll: 10 },
    { id: 'heart', name: 'Iron Heart', perk: '+1 heart (4 total)', cost: 300, heartsBonus: 1 },
    { id: 'flow', name: 'Spirit Flow', perk: 'Spirit gain +25%', cost: 250, spiritMult: 1.25 },
    { id: 'eye', name: 'Keen Eye', perk: 'Feint flashes shown 100 ms earlier', cost: 200, feintEarlyMs: 100 }
  ];

  /* ---------------- Hints (SCRIPT §2.3, §1.4) ---------------- */
  var HINTS = {
    duel1First: 'Tap FIRE when the blade flashes!',
    duel1AfterFirst: 'Perfect! Keep going.',
    duel2Feint: 'A fake flash! Wait for the bright one.',
    wrongElement: 'Wrong element — match the blade\u2019s colour!',
    spiritReady: 'SPIRIT READY — tap SUN SLASH!'
  };

  var DATA = {
    DUELISTS: DUELISTS,
    SWORDS: SWORDS,
    TRAINING: TRAINING,
    HINTS: HINTS,
    duelistById: function (id) {
      for (var i = 0; i < DUELISTS.length; i++) if (DUELISTS[i].id === id) return DUELISTS[i];
      return null;
    },
    swordById: function (id) {
      for (var i = 0; i < SWORDS.length; i++) if (SWORDS[i].id === id) return SWORDS[i];
      return null;
    },
    // Prototype slice: duels 1–2 playable. Full build: all 12.
    PROTOTYPE_MAX_DUEL: 2
  };

  root.REData = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
