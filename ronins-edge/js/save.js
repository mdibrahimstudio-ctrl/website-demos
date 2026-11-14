/* Ronin's Edge — save wrapper (SCRIPT §8). Key ronins_edge_save_v1.
   UMD: browser global (window.RESave) and Node. */
(function (root) {
  'use strict';

  function defaultSave(CFG) {
    return {
      version: 1,
      unlocked: 1,          // highest unlocked duelist id
      stars: {},            // duelistId -> 0..3
      bestScore: {},        // duelistId -> number
      perfects: {},         // duelistId -> best perfect count
      honor: 0,
      swords: ['training'],
      equipped: 'training',
      training: [],
      sound: true,
      daily: { date: '', done: false }
    };
  }

  function createSave(CFG) {
    var KEY = CFG.SAVE_KEY;
    var mem = null; // in-memory fallback when localStorage is unavailable

    function store() {
      try {
        if (typeof localStorage !== 'undefined') return localStorage;
      } catch (e) { /* private mode etc. */ }
      return null;
    }

    function load() {
      var s = store();
      if (s) {
        try {
          var raw = s.getItem(KEY);
          if (raw) {
            var data = JSON.parse(raw);
            if (data && data.version === 1) return data;
          }
        } catch (e) { /* corrupt -> fresh default */ }
      }
      if (mem) return mem;
      return defaultSave(CFG);
    }

    function save(data) {
      mem = data;
      var s = store();
      if (s) {
        try { s.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
      }
    }

    function applyDuelResult(saveData, result) {
      var id = String(result.duelistId);
      if (result.won) {
        if (result.stars > (saveData.stars[id] || 0)) saveData.stars[id] = result.stars;
        if (result.score > (saveData.bestScore[id] || 0)) saveData.bestScore[id] = result.score;
        if (result.perfects > (saveData.perfects[id] || 0)) saveData.perfects[id] = result.perfects;
        if (result.duelistId >= saveData.unlocked) saveData.unlocked = result.duelistId + 1;
        saveData.honor += result.honor;
      }
      return saveData;
    }

    function buySword(saveData, swordId, cost) {
      if (saveData.swords.indexOf(swordId) !== -1) return false;
      if (saveData.honor < cost) return false;
      saveData.honor -= cost;
      saveData.swords.push(swordId);
      return true;
    }

    function buyTraining(saveData, trainingId, cost) {
      if (saveData.training.indexOf(trainingId) !== -1) return false;
      if (saveData.honor < cost) return false;
      saveData.honor -= cost;
      saveData.training.push(trainingId);
      return true;
    }

    return {
      defaultSave: defaultSave,
      load: load,
      save: save,
      applyDuelResult: applyDuelResult,
      buySword: buySword,
      buyTraining: buyTraining
    };
  }

  var api = null;
  if (typeof window !== 'undefined' && window.REConfig) {
    api = createSave(window.REConfig);
    window.RESave = api;
  }
  root.RESaveFactory = createSave;
  if (typeof module !== 'undefined' && module.exports) module.exports = createSave;
})(typeof window !== 'undefined' ? window : globalThis);
