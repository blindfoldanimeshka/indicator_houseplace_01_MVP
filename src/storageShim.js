// napryamuyu — window.storage shim for local development
//
// Inside Claude.ai artifacts, `window.storage` is provided by the host and
// persists data server-side (personal + shared scopes). Outside that
// environment (e.g. running `npm run dev` on your machine), no such API
// exists. This shim installs a localStorage-backed implementation with the
// same async signature, ONLY if `window.storage` isn't already present, so
// the app can be built, run, and tested standalone.
//
// NOTE: this is a dev convenience, not a real backend. localStorage is
// per-browser and not shared between users — the "shared" scope here just
// means "shared across tabs in the same browser", not across real users.
// Before shipping this beyond a prototype, replace this shim with real API
// calls to your own backend (auth, database, etc).

if (typeof window !== 'undefined' && !window.storage) {
  const NS = '__napryamuyu_dev__';
  const scopeKey = (shared) => (shared ? 'shared' : 'personal');
  const fullKey = (key, shared) => `${NS}${scopeKey(shared)}__${key}`;

  window.storage = {
    async get(key, shared = false) {
      const raw = localStorage.getItem(fullKey(key, shared));
      if (raw === null) return null;
      return { key, value: raw, shared };
    },
    async set(key, value, shared = false) {
      localStorage.setItem(fullKey(key, shared), value);
      return { key, value, shared };
    },
    async delete(key, shared = false) {
      localStorage.removeItem(fullKey(key, shared));
      return { key, deleted: true, shared };
    },
    async list(prefix = '', shared = false) {
      const prefixFull = `${NS}${scopeKey(shared)}__${prefix}`;
      const stripLen = `${NS}${scopeKey(shared)}__`.length;
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(prefixFull))
        .map((k) => k.slice(stripLen));
      return { keys, prefix, shared };
    },
  };
}
