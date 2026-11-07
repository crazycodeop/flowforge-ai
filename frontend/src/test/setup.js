import "@testing-library/jest-dom";

const store = {};
const localStorageMock = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => {
    store[key] = String(value);
  },
  removeItem: (key) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});
globalThis.localStorage = localStorageMock;
