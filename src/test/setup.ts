import "@testing-library/jest-dom";
// Tranche IDB — IndexedDB polyfill for jsdom so the projectile store
// (write-through to IDB) and the migration helper can be exercised in tests.
import "fake-indexeddb/auto";
import { beforeEach } from "vitest";
import { projectileStore } from "@/lib/storage";
import { __resetProjectileRepoForTests } from "@/lib/projectile-repo";

/**
 * Tranche IDB — réinitialisation systématique du cache mémoire du
 * `projectileStore` et de la couche IDB entre chaque test.
 *
 * Avant la migration, les tests s'appuyaient sur `localStorage.clear()`
 * pour repartir d'un store vide. Désormais le store a un cache mémoire
 * (variable de module) qui survit aux clear() de localStorage. Sans ce
 * reset, l'état d'un test fuiterait dans le suivant.
 */
beforeEach(async () => {
  (projectileStore as unknown as { __resetForTests?: () => void }).__resetForTests?.();
  await __resetProjectileRepoForTests();
});

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
