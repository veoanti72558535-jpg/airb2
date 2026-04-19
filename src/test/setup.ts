import "@testing-library/jest-dom";
// Tranche IDB — IndexedDB polyfill for jsdom so the projectile store
// (write-through to IDB) and the migration helper can be exercised in tests.
import "fake-indexeddb/auto";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
