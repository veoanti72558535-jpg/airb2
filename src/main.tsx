import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapStorage } from "./lib/storage";

/**
 * Tranche IDB — on attend l'hydratation du cache mémoire `projectileStore`
 * (migration localStorage → IndexedDB + lecture initiale) avant le premier
 * render, afin que QuickCalc/Sessions/Picker voient immédiatement la
 * librairie projectile sans flash "liste vide".
 *
 * Le bootstrap est défensif : toute erreur IDB y est avalée et journalisée,
 * le cache reste alors `[]` et l'app démarre quand même.
 */
const root = createRoot(document.getElementById("root")!);
bootstrapStorage().finally(() => {
  root.render(<App />);
});
