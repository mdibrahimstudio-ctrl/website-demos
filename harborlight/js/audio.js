/* Harborlight — all sound is synthesized with Web Audio (SCRIPT §7.4).
   No audio files. The context is created/resumed on the first user gesture.
   Sound and Music are independent buses with independent toggles. */
(function () {
  'use strict';

  var ctx = null, master = null, musicBus = null;
  var soundOn = true, musicOn = true;
  var waves = null, hum = null, musicTimer = null;
  var chordIdx = 0, nextChordAt = 0, arpStep = 0;

  // Harbour-at-night progression (SCRIPT §7.4): Cmaj7 – Am7 – Fmaj7 – G6
  var CHORDS = [
    [130.81, 164.81, 196.00, 246.94],
    [110.00, 130.81, 164.81, 196.00],
    [87.31, 110.00, 130.81, 174.61],
    [98.00, 123.47, 146.83, 196.00]
  ];
  var PENTA = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.9; musicBus.connect(master);
      return true;
    } catch (e) { return false; }
  }

  function noiseBuffer(seconds, brown) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * white) / 1.02; d[i] = last * 3.2; }
      else d[i] = white;
    }
    return buf;
  }
  var cachedNoise = null, cachedBrown = null;
  function getNoise() { if (!cachedNoise) cachedNoise = noiseBuffer(1.5, false); return cachedNoise; }
  function getBrown() { if (!cachedBrown) cachedBrown = noiseBuffer(3, true); return cachedBrown; }

  /* ------- continuous layers ------- */
  function startWaves() {
    if (!ensure() || waves || !soundOn) return;
    var src = ctx.createBufferSource(); src.buffer = getBrown(); src.loop = true;
    var filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420;
    var g = ctx.createGain(); g.gain.value = 0.055;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    var lfoG = ctx.createGain(); lfoG.gain.value = 130;
    lfo.connect(lfoG); lfoG.connect(filt.frequency);
    var lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.05;
    var lfo2G = ctx.createGain(); lfo2G.gain.value = 0.02;
    lfo2.connect(lfo2G); lfo2G.connect(g.gain);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(); lfo.start(); lfo2.start();
    waves = { src: src, g: g, lfo: lfo, lfo2: lfo2 };
  }
  function stopWaves() {
    if (!waves) return;
    try { waves.src.stop(); waves.lfo.stop(); waves.lfo2.stop(); } catch (e) {}
    waves = null;
  }
  function startHum() {
    if (!ensure() || hum) return;
    var g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 98;
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 147;
    o1.connect(g); o2.connect(g); o1.start(); o2.start();
    hum = { g: g, o1: o1, o2: o2 };
  }

  /* ------- music: slow generative pad + music-box arpeggio ------- */
  function playChord(freqs, at) {
    freqs.forEach(function (f) {
      var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.030, at + 1.4);
      g.gain.setValueAtTime(0.030, at + 2.6);
      g.gain.linearRampToValueAtTime(0, at + 4.2);
      o.connect(g); g.connect(musicBus);
      o.start(at); o.stop(at + 4.3);
    });
  }
  function playArp(freq, at) {
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.014, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    o.connect(g); g.connect(musicBus);
    o.start(at); o.stop(at + 0.55);
  }
  function musicTick() {
    if (!ctx || !musicOn) return;
    var ahead = ctx.currentTime + 0.35;
    while (nextChordAt < ahead) {
      playChord(CHORDS[chordIdx % CHORDS.length], nextChordAt);
      // one quiet music-box note per second across the chord
      for (var s = 0; s < 4; s++) {
        var chord = CHORDS[chordIdx % CHORDS.length];
        playArp(chord[(arpStep + s) % chord.length] * 4, nextChordAt + s);
      }
      arpStep += 1;
      chordIdx += 1;
      nextChordAt += 4;
    }
  }
  function startMusic() {
    if (!ensure() || musicTimer || !musicOn) return;
    nextChordAt = ctx.currentTime + 0.1;
    musicTimer = setInterval(musicTick, 250);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  /* ------- one-shots ------- */
  function strike(freq, vol, decay, delay) {
    if (!ensure() || !soundOn) return;
    var t = ctx.currentTime + (delay || 0);
    [[1, 1], [2.01, 0.5], [2.74, 0.25], [3.76, 0.1]].forEach(function (p) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * p[0];
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol * p[1], t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + decay + 0.05);
    });
  }
  function noiseHit(dur, filterType, f0, f1, vol, delay) {
    if (!ensure() || !soundOn) return;
    var t = ctx.currentTime + (delay || 0);
    var src = ctx.createBufferSource(); src.buffer = getNoise();
    var filt = ctx.createBiquadFilter(); filt.type = filterType;
    filt.frequency.setValueAtTime(f0, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }
  function toneSweep(type, f0, f1, dur, vol, delay) {
    if (!ensure() || !soundOn) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  window.HLAudio = {
    unlock: function () {
      if (!ensure()) return;
      if (soundOn) startWaves();
      if (musicOn) startMusic();
      startHum();
    },
    setSound: function (on) {
      soundOn = on;
      if (!on) { stopWaves(); this.setHum(false); } else if (ctx) startWaves();
    },
    setMusic: function (on) {
      musicOn = on;
      if (!on) stopMusic(); else if (ctx) startMusic();
    },
    applySettings: function (settings) {
      soundOn = settings.sound !== false;
      musicOn = settings.music !== false;
    },
    setHum: function (on) {
      if (!hum || !ctx) return;
      var target = (on && soundOn) ? 0.035 : 0;
      hum.g.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
    },
    click: function () { toneSweep('square', 660, 520, 0.06, 0.05); },
    shipBell: function () { strike(1244, 0.10, 1.1); },
    harborBell: function () { strike(1046, 0.20, 2.2); strike(1568, 0.07, 1.4); },
    comboChime: function (level) {
      strike(PENTA[Math.min(Math.max(level - 1, 0), PENTA.length - 1)], 0.13, 1.5);
    },
    starBell: function (i) { strike(PENTA[Math.min(i + 1, PENTA.length - 1)], 0.16, 1.8); },
    whoosh: function () { noiseHit(0.25, 'bandpass', 400, 1800, 0.14); },
    thunk: function () { toneSweep('sine', 120, 55, 0.18, 0.30); noiseHit(0.10, 'lowpass', 500, 120, 0.16); },
    scrape: function () { noiseHit(0.30, 'bandpass', 900, 280, 0.13); },
    crateTick: function (i) { toneSweep('square', 1300 + (i || 0) * 70, 900, 0.045, 0.06); },
    plop: function () { toneSweep('sine', 320, 85, 0.18, 0.16); },
    stamp: function () { toneSweep('sine', 90, 50, 0.13, 0.32); noiseHit(0.08, 'lowpass', 900, 200, 0.10); },
    foghorn: function () {
      if (!ensure() || !soundOn) return;
      var t = ctx.currentTime;
      [98, 98.7].forEach(function (f) {
        var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        var filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.055, t + 0.45);
        g.gain.setValueAtTime(0.055, t + 1.1);
        g.gain.linearRampToValueAtTime(0, t + 1.9);
        o.connect(filt); filt.connect(g); g.connect(master);
        o.start(t); o.stop(t + 2);
      });
    },
    dawnBell: function () { strike(392, 0.18, 3.0); },
    completeBells: function () {
      strike(523.25, 0.16, 2.0, 0);
      strike(659.25, 0.16, 2.2, 0.22);
      strike(783.99, 0.18, 2.6, 0.44);
    }
  };
})();
