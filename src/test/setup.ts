/** In-memory localStorage so the persisted Zustand store runs under Node. */
const mem = new Map<string, string>();

globalThis.localStorage = {
  get length() {
    return mem.size;
  },
  clear: () => mem.clear(),
  getItem: k => mem.get(k) ?? null,
  key: i => [...mem.keys()][i] ?? null,
  removeItem: k => void mem.delete(k),
  setItem: (k, v) => void mem.set(k, String(v)),
};
