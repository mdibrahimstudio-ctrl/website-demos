/* Harborlight — localStorage wrapper around the pure save model in logic.js.
   Key: harborlight_save_v1 (SCRIPT §9.2). A corrupted or missing save loads as a
   fresh save without ever throwing at the player. */
(function () {
  'use strict';
  var KEY = window.HLConfig.SAVE_KEY;

  window.HLSave = {
    load: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        return window.HLLogic.validateSave(raw ? JSON.parse(raw) : null);
      } catch (e) {
        return window.HLLogic.defaultSave();
      }
    },
    store: function (save) {
      try { window.localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode etc. */ }
    },
    reset: function () {
      var s = window.HLLogic.defaultSave();
      this.store(s);
      return s;
    }
  };
})();
