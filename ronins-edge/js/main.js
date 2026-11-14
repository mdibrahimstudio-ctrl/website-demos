/* Ronin's Edge — Phaser 4 boot config. 1280x720 logical field (SCRIPT §1.1),
   FIT-scaled and centred; playable down to the 800x450 portal size. */
(function () {
  'use strict';

  window.__RE_VERSION = 'prototype-0.1';

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#141428',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: { antialias: true, roundPixels: false },
    scene: [
      window.REBootScene,
      window.REMenuScene,
      window.REPathScene,
      window.REDojoScene,
      window.REHowToScene,
      window.REDuelScene,
      window.REResultScene,
      window.REPauseScene
    ]
  });
})();
