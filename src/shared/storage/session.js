// Session storage wrapper with safe fallbacks and helpers
// Keeps existing keys for backward compatibility.
// Implements the IStorage contract (see shared/storage/types.js)

const memoryStore = new Map();

export const canUseSession = () => {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch (e) {
    return false;
  }
};

const getItem = (key, defaultValue = null) => {
  if (!key) return defaultValue;
  if (canUseSession()) {
    try {
      const v = window.sessionStorage.getItem(key);
      return v === null ? defaultValue : v;
    } catch (e) {
      // fall through to memory
    }
  }
  return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
};

const setItem = (key, value) => {
  if (!key) return;
  if (canUseSession()) {
    try {
      window.sessionStorage.setItem(key, String(value));
      return;
    } catch (e) {
      // fall through to memory
    }
  }
  memoryStore.set(key, String(value));
};

const removeItem = (key) => {
  if (!key) return;
  if (canUseSession()) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  }
  memoryStore.delete(key);
};

const getBool = (key, defaultValue = false) => {
  const v = getItem(key, null);
  if (v === null) return defaultValue;
  return v === 'true';
};

const setBool = (key, bool) => setItem(key, bool ? 'true' : 'false');

export default {
  getItem,
  setItem,
  removeItem,
  getBool,
  setBool,
};

// Factory to create a pure in-memory storage implementing IStorage (useful for tests)
export const createMemoryStorage = () => {
  const store = new Map();
  return {
    getItem: (key, def = null) => (store.has(key) ? store.get(key) : def),
    setItem: (key, value) => key && store.set(key, String(value)),
    removeItem: (key) => key && store.delete(key),
    getBool: (key, def = false) => {
      const v = store.has(key) ? store.get(key) : null;
      return v === null ? def : v === 'true';
    },
    setBool: (key, bool) => key && store.set(key, bool ? 'true' : 'false'),
  };
};
