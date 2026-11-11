/* Harborlight — shared constants (SCRIPT.md values).
   UMD: works as a browser global (window.HLConfig) and in Node (module.exports). */
(function (root) {
  'use strict';

  var CONFIG = {
    FIELD_W: 1280,
    FIELD_H: 720,

    // Lighthouse geometry (SCRIPT §1.1): tower base bottom-centre, lamp above it,
    // harbor gate crescent immediately in front of the point.
    LAMP: { x: 640, y: 592 },
    GATE: { x: 640, y: 690 },
    TOWER_BASE: { x: 640, y: 668 },

    // Beam (SCRIPT §1.2). Arc: 200 degrees sea-facing, centred on north.
    BEAM: {
      length: 680,
      halfAngleDeg: 14,
      maxRateDeg: 155,      // max rotation speed, deg/s (tunable)
      smoothing: 11,        // exponential response, /s (tunable)
      edgeEff: 0.55,        // turn effectiveness at cone edge
      centreFrac: 0.4       // inner fraction of cone that gives 100%
    },
    BEAM_ARC_CENTRE_DEG: -90,  // north in screen atan2 degrees
    BEAM_ARC_HALF_DEG: 100,    // 200-degree arc

    // Harbor approach & docking (SCRIPT §1.3)
    APPROACH_R: 190,
    CAPTURE_R: 58,
    APPROACH_SPEED: 58,
    CAPTURE_HEADING_DEG: 65,
    BERTH_TIME: 1.2,

    // Movement feel (SCRIPT §1.3)
    ACCEL: 65,        // px/s^2 up to cruising speed
    DECEL: 90,        // px/s^2 slowing for the approach
    VEL_ALIGN: 2.8,   // /s — velocity vector aligns to heading (the nautical slide)

    // Scoring (SCRIPT §1.6)
    COMBO_WINDOW: 20,         // seconds between dockings to keep a combo alive
    NEAR_MISS_BAND: 18,       // px beyond collision distance that counts as a near miss

    // Coast safety (build-level, implied by SCRIPT §2.2 spawn rules): a ship that
    // reaches the pale shoal line at the field edge follows the coast home-ward
    // instead of sailing off the chart forever. Rarely seen with authored spawns.
    EDGE_MARGIN: 30,
    COAST_TURN_DEG: 45,       // deg/s the coast current turns a stray ship

    SAVE_KEY: 'harborlight_save_v1',

    // Berth slots along the quay, centre-out (SCRIPT §1.3 berthing).
    BERTHS: [
      { x: 592, y: 706 }, { x: 668, y: 706 },
      { x: 520, y: 702 }, { x: 740, y: 702 },
      { x: 452, y: 696 }, { x: 808, y: 696 }
    ],

    // Sea 1 — Moonlit Bay palette (SCRIPT §8.2)
    PALETTE: {
      deepWater: 0x12233F,
      midWater: 0x1B3358,
      sparkle: 0xBFE3FF,
      skyBand: 0x24365E,
      beamCore: 0xFFF3C4,
      beamFalloff: 0xF5B95E,
      lantern: 0xFFC46B,
      cream: 0xF7ECD2,
      brass: 0xC9A227,
      danger: 0xE4572E
    }
  };

  root.HLConfig = CONFIG;
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
