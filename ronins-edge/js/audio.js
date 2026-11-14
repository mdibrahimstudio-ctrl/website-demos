/* Ronin's Edge — synthesized audio (SCRIPT §7). All WebAudio, no audio files.
   Lazily initialised on the first user gesture; no-ops when AudioContext is
   unavailable (jsdom, muted autoplay policies). UMD: window.REAudio / Node. */
(function (root) {
  'use strict';

  function createAudio() {
    var ctx = null;
    var master = null;
    var muted = false;
    var windNodes = null;

    function ensure() {
      if (ctx) return true;
      try {
        var AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        return true;
      } catch (e) { return false; }
    }

    function unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    }

    function setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
      if (m) stopWind();
    }
    function isMuted() { return muted; }

    function tone(freq, dur, type, vol, when, slideTo) {
      if (!ensure() || muted) return;
      var t0 = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }

    function noise(dur, vol, filterFreq, when) {
      if (!ensure() || muted) return;
      var t0 = ctx.currentTime + (when || 0);
      var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = filterFreq || 1200;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0);
    }

    // Metallic clang — pitch rises a semitone per combo step (capped +8).
    function clang(combo) {
      var steps = Math.min(combo || 0, 8);
      var mult = Math.pow(2, steps / 12);
      tone(1244 * mult, 0.12, 'square', 0.10);
      tone(1866 * mult, 0.10, 'triangle', 0.12);
      noise(0.08, 0.10, 4000);
    }

    function perfectChime(combo) {
      clang(combo);
      tone(880, 0.15, 'sine', 0.12, 0.02);
      tone(1320, 0.15, 'sine', 0.10, 0.08);
      tone(1760, 0.2, 'sine', 0.08, 0.14);
    }

    function whoosh() { noise(0.2, 0.12, 900); }

    function hit() {
      tone(80, 0.25, 'sine', 0.35, 0, 40);
      noise(0.12, 0.15, 300);
    }

    function fooled() {
      tone(300, 0.15, 'sawtooth', 0.08, 0, 180);
    }

    function special() {
      tone(200, 0.5, 'sine', 0.25, 0, 2000);
      noise(0.4, 0.2, 2500, 0.05);
      tone(1760, 0.3, 'sine', 0.1, 0.1);
    }

    function click() { tone(660, 0.05, 'sine', 0.12); }

    function fanfare() {
      [523, 659, 784, 1046].forEach(function (f, i) {
        tone(f, 0.25, 'triangle', 0.15, i * 0.12);
      });
    }

    function lose() {
      [392, 330, 262].forEach(function (f, i) {
        tone(f, 0.3, 'triangle', 0.12, i * 0.18);
      });
    }

    function startWind() {
      if (!ensure() || muted || windNodes) return;
      var len = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 400;
      var g = ctx.createGain(); g.gain.value = 0.03;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
      windNodes = { src: src, gain: g };
    }

    function stopWind() {
      if (!windNodes) return;
      try { windNodes.src.stop(); } catch (e) {}
      windNodes = null;
    }

    return {
      unlock: unlock, setMuted: setMuted, isMuted: isMuted,
      clang: clang, perfectChime: perfectChime, whoosh: whoosh,
      hit: hit, fooled: fooled, special: special, click: click,
      fanfare: fanfare, lose: lose, startWind: startWind, stopWind: stopWind
    };
  }

  var api = createAudio();
  if (typeof window !== 'undefined') window.REAudio = api;
  root.REAudioFactory = createAudio;
  if (typeof module !== 'undefined' && module.exports) module.exports = createAudio;
})(typeof window !== 'undefined' ? window : globalThis);
