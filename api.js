/**
 * Client for the wedding RSVP Apps Script proxy.
 *
 * Loaded via a <script> tag before script.js and admin.js; exposes one global.
 * There is no bundler in this project — do not add import/export.
 */
(function () {
  // Apps Script web app /exec URL. Set this after deploying; see apps-script/README.md.
  // This is not a secret: the script decides what it returns, and it never
  // returns the full guest list without the admin passphrase.
  var API_URL = "https://script.google.com/macros/s/AKfycbyqDky8vSDuzNK4bZmp0E7wnk96s7QBmomsLEnc17NSLlP7gYcb9NJshxeCtr1THoy3Jg/exec";

  async function call(payload) {
    if (API_URL.indexOf("REPLACE_ME") !== -1) {
      return { ok: false, error: "not_configured" };
    }
    try {
      // text/plain keeps this a CORS "simple request" so no preflight is sent.
      // Apps Script does not answer OPTIONS, so application/json would fail.
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });
      if (!res.ok) return { ok: false, error: "network" };
      return await res.json();
    } catch (_err) {
      return { ok: false, error: "network" };
    }
  }

  window.WeddingApi = {
    lookup: function (phone) {
      return call({ action: "lookup", phone: phone });
    },
    submit: function (phone, responses, notes) {
      return call({ action: "submit", phone: phone, responses: responses, notes: notes });
    },
    adminList: function (passphrase) {
      return call({ action: "adminList", passphrase: passphrase });
    },
  };
})();
