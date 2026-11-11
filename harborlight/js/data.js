/* Harborlight — game data: ship types, Night manifests/spawn schedules, rocks,
   buildings, logbook, hints, upgrades (all values from SCRIPT.md).
   Angles in spawn schedules are compass-style screen degrees (atan2 with y down):
   0 = east, 90 = south (down-screen), -90 = north, 180 = west.
   UMD: browser global (window.HLData) and Node. */
(function (root) {
  'use strict';

  /* ---------------- Ship types (SCRIPT §5) ---------------- */
  var SHIP_TYPES = {
    FB: {
      id: 'FB', name: 'Fishing Boat', title: 'the Dawn Fleet',
      speed: 56, turnDeg: 95, cargo: 2, w: 46, h: 20, radius: 15,
      lantern: 0xFFF2CC, hull: 0x7A4A2B, accent: 0xF7ECD2,
      story: 'Out before the gulls, home before the lamps. The Dawn Fleet trusts your light more than the moon.'
    },
    CB: {
      id: 'CB', name: 'Cargo Brig', title: 'Bramble & Co.',
      speed: 48, turnDeg: 62, cargo: 6, w: 74, h: 28, radius: 23,
      lantern: 0xFFC46B, hull: 0x5C3A21, accent: 0xC9A227,
      story: 'Bramble & Co. have carried tea, timber and one extremely nervous goat. Tonight, you carried them.'
    },
    MC: {
      id: 'MC', name: 'Mail Clipper', title: 'the Night Mail',
      speed: 84, turnDeg: 74, cargo: 3, w: 68, h: 22, radius: 21,
      lantern: 0xD8FBFF, hull: 0x2E4A5C, accent: 0x9ADBE8,
      story: 'Every letter aboard was promised for morning. Because of you, the promise holds.'
    },
    TK: {
      id: 'TK', name: 'Tanker', title: 'MV Cormorant',
      speed: 42, turnDeg: 36, cargo: 10, w: 104, h: 34, radius: 33,
      lantern: 0xFF6B5E, hull: 0x3A3F4A, accent: 0x8A93A5,
      story: 'Too big to turn quickly, too proud to ask for help — until your light asked for her.'
    }
  };

  /* ---------------- Nights 1–3 (SCRIPT §3.2, §6) ----------------
     Spawn headings sit within ~35 degrees of the gate bearing so an unlit ship
     stays in play on the harbor side; the interesting work is the curve home. */
  var NIGHTS = [
    {
      id: 1, name: 'First Light', length: 150, maxActive: 2,
      tutorial: true, gentle: true, // SCRIPT §6: no incidents possible in Night 1
      beamStartDeg: -117.7,          // pre-aimed at ship 1, slightly off-centre (tutorial arc)
      rocks: [{ x: 1010, y: 432, r: 26 }], // decorative — ship 2's unlit line passes ~99px clear
      spawns: [
        { t: 0,  type: 'FB', x: 215,  y: 42,  headingDeg: 0   },  // tutorial ship — starts lit, wide teaching arc home
        { t: 21, type: 'FB', x: 1230, y: 262, headingDeg: 166 },  // right edge, drifts past the decorative rock
        { t: 34, type: 'CB', x: 170,  y: 56,  headingDeg: 96  },  // teaches juggling + first combo
        { t: 58, type: 'FB', x: 1064, y: 64,  headingDeg: 120 },
        { t: 84, type: 'CB', x: 30,   y: 300, headingDeg: 34  }
      ],
      lesson: 'Drag anywhere — move your light.'
    },
    {
      id: 2, name: 'The Lone Rock', length: 165, maxActive: 2,
      rocks: [{ x: 640, y: 308, r: 36 }], // one central rock — the straight line home scrapes it
      spawns: [
        { t: 0,   type: 'CB', x: 205,  y: 74,  headingDeg: 96  },
        { t: 5,   type: 'FB', x: 1078, y: 78,  headingDeg: 118 },
        { t: 32,  type: 'FB', x: 44,   y: 250, headingDeg: 42  },
        { t: 56,  type: 'CB', x: 1236, y: 236, headingDeg: 142 },
        { t: 82,  type: 'FB', x: 600,  y: 40,  headingDeg: 98  }, // straight home would graze the rock — curve her
        { t: 108, type: 'CB', x: 852,  y: 52,  headingDeg: 74  }
      ],
      lesson: 'Rocks! Curve your light around them.'
    },
    {
      id: 3, name: 'Crossing Lanterns', length: 180, maxActive: 3,
      rocks: [{ x: 420, y: 336, r: 24 }, { x: 864, y: 300, r: 24 }],
      spawns: [
        { t: 0,   type: 'CB', x: 150,  y: 88,  headingDeg: 62  },
        { t: 6,   type: 'MC', x: 1136, y: 104, headingDeg: 128 }, // fast — crosses the Brig's line near the approach
        { t: 30,  type: 'FB', x: 648,  y: 40,  headingDeg: 92  },
        { t: 54,  type: 'CB', x: 44,   y: 430, headingDeg: 18  },
        { t: 78,  type: 'MC', x: 1236, y: 420, headingDeg: 168 },
        { t: 104, type: 'FB', x: 300,  y: 52,  headingDeg: 78  },
        { t: 128, type: 'CB', x: 972,  y: 56,  headingDeg: 96  }
      ],
      lesson: 'Mail Clipper — fast, so light her early.'
    }
  ];

  /* ---------------- Town buildings (SCRIPT §4.2) ---------------- */
  var BUILDINGS = [
    { id: 'cottage',    name: "Keeper's Cottage",    at: 0,   note: 'Your home base.' },
    { id: 'fishmarket', name: 'Fish Market',         at: 25,  note: 'Stalls, awnings and gulls. The market bell joins the harbor.' },
    { id: 'bakery',     name: 'Bakery',              at: 60,  note: 'Warm windows and chimney smoke over the quay.' },
    { id: 'sailoft',    name: 'Sail Loft',           at: 110, note: 'Sails drying on lines, swaying in the sea wind.' },
    { id: 'chandlery',  name: 'Rope & Chandlery',    at: 175, note: 'Rope coils and lanterns in the window.' },
    { id: 'seconddock', name: 'Second Dock',         at: 250, note: 'A second berth — two ships can berth at once.' },
    { id: 'inn',        name: 'Harbor Inn',          at: 340, note: 'Lit windows and travellers watching the light.' },
    { id: 'clocktower', name: 'Clock Tower',         at: 440, note: 'Keeps the harbor\u2019s best times.' },
    { id: 'shipyard',   name: 'Shipyard',            at: 560, note: 'The first scrape each Night is patched free.' },
    { id: 'festival',   name: 'Festival Pier',       at: 700, note: 'Bunting, lantern strings and a bandstand.' }
  ];

  /* ---------------- Upgrades (SCRIPT §4.4) — Slice 1 ships Wide Lens I -------- */
  var UPGRADES = {
    wideLens: {
      id: 'wideLens', name: 'Wide Lens',
      blurb: 'A wider beam holds a ship more easily — and can cradle two nearby ships at once.',
      levels: [
        { cost: 40, halfAngleDeg: 18 },
        { cost: 90, halfAngleDeg: 22 }
      ],
      sliceLevels: 1 // Slice 1 sells level I only; level II arrives with the full voyage
    }
  };

  /* ---------------- First-appearance hints (SCRIPT §3.7) ---------------- */
  var HINTS = {
    drag:        'Drag anywhere — move your light.',
    follow:      'Ships follow your light home.',
    gate:        'Guide her through the glowing gate.',
    rock:        'Rocks! Curve your light around them.',
    clipper:     'Mail Clipper — fast, so light her early.',
    tanker:      'Tankers turn slowly — start the turn early.',
    missed:      'Too steep — bring her around for another approach.',
    collision:   'Two ships, one light — choose who turns first.'
  };

  var DATA = {
    SHIP_TYPES: SHIP_TYPES,
    NIGHTS: NIGHTS,
    BUILDINGS: BUILDINGS,
    UPGRADES: UPGRADES,
    HINTS: HINTS,
    LOGBOOK_ORDER: ['FB', 'CB', 'MC', 'TK']
  };

  root.HLData = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
