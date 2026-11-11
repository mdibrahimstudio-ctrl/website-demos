/* Harborlight — Phaser boot config. 1280x720 logical field (SCRIPT §1.1),
   FIT-scaled and centred; playable down to the 800x450 portal size (§10.3). */
(function () {
  'use strict';

  window.__HL_VERSION = 'slice1-0.1';

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#0D1A2E',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: { antialias: true, roundPixels: false },
    scene: [
      window.HLBootScene,
      window.HLMenuScene,
      window.HLNightSelectScene,
      window.HLHarborScene,
      window.HLLogbookScene,
      window.HLSettingsScene,
      window.HLPauseScene,
      window.HLNightScene
    ]
  });
})();
