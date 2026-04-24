# Golden cases request — Ready-to-send template (FR + EN)

> **Purpose / But.** Self-contained message you can copy-paste as-is into an
> email, a Discord DM, a GitHub issue, or a forum thread, without needing
> to attach any other file from this repo. Includes a **fully worked
> example** (inputs + expected outputs) and the **deterministic
> cross-validation procedure** that we apply on receipt — no AI, no OCR,
> no opaque heuristic.
>
> **Companion documents (optional, do NOT need to be sent)** :
> - `docs/handoff/golden-cases-request.md` — long-form rationale & coverage matrix
> - `docs/validation/external-case-json.md` — canonical schema v1 reference
> - `docs/handoff/templates/golden-case-template.json` — empty JSON skeleton
>
> **Status.** Pure documentation. No engine, UI, schema, or test changed
> by this file.

---

## How to use this template

1. Pick the language block (FR §1 or EN §2) that matches the recipient.
2. Copy from `>>> BEGIN MESSAGE` to `<<< END MESSAGE`.
3. Replace the four placeholders : `{{RECIPIENT_NAME}}`,
   `{{YOUR_NAME}}`, `{{CONTACT_CHANNEL}}`, `{{REPO_OR_LINK}}`.
4. (Optional) Replace the worked example caliber/projectile if you know
   the recipient works on a different one — keeping the structure
   identical.
5. Send.

The worked example block (`§3`) is **already embedded** inside both
messages — recipient does not need to open any other file to understand
exactly what shape of data we expect back.

---

## 1. Message — Français

>>> BEGIN MESSAGE (FR)

Salut {{RECIPIENT_NAME}},

Je suis {{YOUR_NAME}}, je travaille sur **AirBallistik**, une PWA
airgun-first (calcul de trajectoire PCP, mobile-first, FR/EN). Le moteur
balistique est **100 % déterministe** (intégrateur Euler/Heun, drag G1
ChairGun, atmosphère ICAO), verrouillé par une suite de **snapshots
golden internes** qui détectent toute dérive bit-exact.

Pour le confronter **honnêtement** à une référence externe, j'aimerais
récupérer 1 à N « golden cases » exportés depuis ton outil. **Pas d'OCR,
pas d'IA, pas de capture d'écran** : un JSON propre, lisible à l'œil,
rempli par toi (ou scripté côté toi). Je consomme ce JSON tel quel dans
un harness comparatif déterministe.

### Ce qu'est un « golden case » concrètement

Un tir reproductible décrit de bout en bout : projectile + tune + scope +
atmosphère + vent + N lignes de sortie (range / drop / velocity, et
optionnellement TOF / dérive vent / énergie).

### Exemple complet — copier ce schéma JSON et remplir

```json
{
  "caseId": "22-jsb-18gr-280-zero30",
  "title": ".22 JSB Exact Jumbo Heavy 18.13gr @ 280 m/s, zero 30 m, ICAO",
  "description": "Cas pédagogique — pellet .22 standard, atmosphère standard, vent nul.",
  "tags": [".22", "pellet", "zero-30", "icao"],
  "inputs": {
    "projectileName": "JSB Exact Jumbo Heavy",
    "projectileType": "pellet",
    "caliber": ".22",
    "diameterMm": 5.52,
    "weightGrains": 18.13,
    "bc": 0.030,
    "bcModel": "G1",
    "muzzleVelocity": 280.0,
    "sightHeight": 50,
    "zeroDistance": 30,
    "temperatureC": 15,
    "pressureHpaAbsolute": 1013.25,
    "humidityPercent": 50,
    "altitudeM": 0,
    "windSpeed": 0,
    "windDirection": 0,
    "windConvention": "0deg=12h-headwind",
    "rangeStart": 10,
    "rangeMax": 100,
    "rangeStep": 10,
    "sourceUnitsNote": "m, mm, m/s, hPa absolu",
    "comment": null
  },
  "references": [
    {
      "meta": {
        "source": "chairgun-elite",
        "version": "ChairGun Elite 1.x build 2025-04",
        "confidence": "A",
        "extractionMethod": "export-json",
        "extractedAt": "2026-04-24",
        "operator": "{{YOUR_NAME}}",
        "sourceUri": null,
        "assumptions": [
          "BC interprété comme G1 (pas de table custom)",
          "Atmosphère ICAO standard (T=15°C, P=1013.25 hPa, HR=50%)",
          "Vent : 0° = headwind à 12h, sens horaire",
          "Drop signé : négatif = sous la ligne de visée"
        ],
        "notes": null
      },
      "rows": [
        { "range": 10, "drop":  -8.5, "velocity": 270.4, "tof": 0.0364, "windDrift": 0.0, "energy": 42.9 },
        { "range": 20, "drop":  -2.1, "velocity": 261.3, "tof": 0.0741, "windDrift": 0.0, "energy": 40.1 },
        { "range": 30, "drop":   0.0, "velocity": 252.5, "tof": 0.1131, "windDrift": 0.0, "energy": 37.4 },
        { "range": 40, "drop":  -6.2, "velocity": 244.1, "tof": 0.1535, "windDrift": 0.0, "energy": 35.0 },
        { "range": 50, "drop": -19.4, "velocity": 236.0, "tof": 0.1953, "windDrift": 0.0, "energy": 32.7 },
        { "range": 75, "drop": -82.7, "velocity": 217.8, "tof": 0.3046, "windDrift": 0.0, "energy": 27.8 },
        { "range":100, "drop":-202.5, "velocity": 201.4, "tof": 0.4216, "windDrift": 0.0, "energy": 23.8 }
      ]
    }
  ],
  "notes": null,
  "schemaVersion": 1
}
```

Les valeurs ci-dessus sont **illustratives** : elles montrent la forme
attendue, pas une vérité numérique. Le JSON que tu renvoies est ce que
ton outil produit réellement.

### Procédure de cross-validation côté nous (sans IA)

À réception de ton fichier, voici exactement ce qui se passe — aucune
étape n'appelle de modèle IA, ni de service externe :

1. **Validation de schéma.** Le JSON passe par notre parser
   `user-case-schema` (Zod). Tout champ manquant ou typé incorrectement
   te revient avec le détail précis (chemin + valeur).
2. **Conversion d'unités.** Si `sourceUnitsNote` indique pouces / ft·s /
   inHg, conversion vers les unités canoniques (m, mm, m/s, hPa absolus,
   °C). **Aucune extrapolation** : si la conversion perd de la précision,
   un warning est journalisé.
3. **Exécution du moteur.** `calculateTrajectory(inputs)` produit notre
   propre tableau ligne par ligne, sur **les distances exactes** que tu
   as fournies — pas d'interpolation côté moteur.
4. **Comparaison.** Le harness `compareReference` aligne tes lignes sur
   les nôtres et calcule `Δabs` et `Δrel` par métrique. Tolérances par
   défaut versionnées dans `tolerances.ts` :
   - drop : ±2 mm OU ±2 % (le plus permissif des deux)
   - velocity : ±2 m/s OU ±1 %
   - TOF : ±5 ms OU ±2 %
   - wind drift : ±3 mm OU ±5 %
   - energy : ±0.5 J OU ±2 %
5. **Verdict.**
   - `PASS` : 100 % des comparaisons dans les tolérances ET confiance
     source ≥ B.
   - `INDICATIVE` : tout dans les tolérances mais confiance = C, ou
     aucune métrique réellement comparable (cas dégénéré honnête).
   - `FAIL` : ≥ 1 comparaison hors tolérance — j'investigue, je te
     reviens avec le diff exact.
6. **Rapport bilingue FR/EN** auto-généré (markdown) avec inputs,
   outputs moteur, deltas ligne-par-ligne, et conclusion. Je te renvoie
   ce rapport, **sans modifier le moteur silencieusement**. Toute
   évolution du moteur résultant d'un écart est une décision humaine
   explicite, motivée par au moins **deux sources concordantes**.

### Ce qu'on NE fait PAS

- ❌ Pas de mise à jour automatique des snapshots golden si écart.
- ❌ Pas de réécriture de tes valeurs (« correction », smoothing,
  arrondi silencieux).
- ❌ Pas d'IA dans la chaîne d'extraction ni de comparaison.
- ❌ Pas d'exigence d'exclusivité — partage les mêmes cas avec qui tu
  veux.

### Ce que je te demande concrètement

- **1 cas suffit** pour démarrer. La matrice idéale (8 cas couvrant
  .177 / .22 / .25 / .30, pellet vs slug, ICAO vs froid/chaud/altitude/vent
  travers) est documentée dans `docs/handoff/golden-cases-request.md`
  mais **aucune ligne n'est obligatoire**.
- Format : 1 fichier JSON par cas, nommé `<caseId>.json`.
- Canal de retour : {{CONTACT_CHANNEL}}.
- Repo de référence (lecture seule) : {{REPO_OR_LINK}}.

Aucune contrepartie attendue, aucun engagement de support. Notre code
applicatif et nos fixtures de cross-validation sont ouverts, tu peux les
réutiliser pour ton propre besoin.

Merci d'avance,
{{YOUR_NAME}}

<<< END MESSAGE (FR)

---

## 2. Message — English

>>> BEGIN MESSAGE (EN)

Hi {{RECIPIENT_NAME}},

I'm {{YOUR_NAME}}, working on **AirBallistik**, an airgun-first PWA (PCP
trajectory calculator, mobile-first, FR/EN). The ballistic engine is
**100% deterministic** (Euler / Heun integrator, ChairGun G1 drag
table, ICAO atmosphere), pinned by an internal **golden snapshot suite**
that catches any bit-level drift.

To compare it **honestly** against an external reference, I'd love to
collect 1 or more "golden cases" exported from your tool. **No OCR, no
AI, no screenshots** — just a clean JSON file, human-readable, filled in
by you (or scripted on your side). I consume that JSON directly in a
deterministic comparison harness.

### What a "golden case" actually is

A reproducible shot, described end-to-end: projectile + tune + scope +
atmosphere + wind + N output rows (range / drop / velocity, optionally
TOF / wind drift / energy).

### Worked example — copy this schema and fill it in

```json
{
  "caseId": "22-jsb-18gr-280-zero30",
  "title": ".22 JSB Exact Jumbo Heavy 18.13gr @ 280 m/s, zero 30 m, ICAO",
  "description": "Teaching example — standard .22 pellet, ICAO atmosphere, no wind.",
  "tags": [".22", "pellet", "zero-30", "icao"],
  "inputs": {
    "projectileName": "JSB Exact Jumbo Heavy",
    "projectileType": "pellet",
    "caliber": ".22",
    "diameterMm": 5.52,
    "weightGrains": 18.13,
    "bc": 0.030,
    "bcModel": "G1",
    "muzzleVelocity": 280.0,
    "sightHeight": 50,
    "zeroDistance": 30,
    "temperatureC": 15,
    "pressureHpaAbsolute": 1013.25,
    "humidityPercent": 50,
    "altitudeM": 0,
    "windSpeed": 0,
    "windDirection": 0,
    "windConvention": "0deg=12h-headwind",
    "rangeStart": 10,
    "rangeMax": 100,
    "rangeStep": 10,
    "sourceUnitsNote": "m, mm, m/s, absolute hPa",
    "comment": null
  },
  "references": [
    {
      "meta": {
        "source": "chairgun-elite",
        "version": "ChairGun Elite 1.x build 2025-04",
        "confidence": "A",
        "extractionMethod": "export-json",
        "extractedAt": "2026-04-24",
        "operator": "{{YOUR_NAME}}",
        "sourceUri": null,
        "assumptions": [
          "BC interpreted as G1 (no custom drag table)",
          "ICAO standard atmosphere (T=15°C, P=1013.25 hPa, RH=50%)",
          "Wind: 0° = headwind at 12 o'clock, clockwise",
          "Signed drop: negative = below line of sight"
        ],
        "notes": null
      },
      "rows": [
        { "range": 10, "drop":  -8.5, "velocity": 270.4, "tof": 0.0364, "windDrift": 0.0, "energy": 42.9 },
        { "range": 20, "drop":  -2.1, "velocity": 261.3, "tof": 0.0741, "windDrift": 0.0, "energy": 40.1 },
        { "range": 30, "drop":   0.0, "velocity": 252.5, "tof": 0.1131, "windDrift": 0.0, "energy": 37.4 },
        { "range": 40, "drop":  -6.2, "velocity": 244.1, "tof": 0.1535, "windDrift": 0.0, "energy": 35.0 },
        { "range": 50, "drop": -19.4, "velocity": 236.0, "tof": 0.1953, "windDrift": 0.0, "energy": 32.7 },
        { "range": 75, "drop": -82.7, "velocity": 217.8, "tof": 0.3046, "windDrift": 0.0, "energy": 27.8 },
        { "range":100, "drop":-202.5, "velocity": 201.4, "tof": 0.4216, "windDrift": 0.0, "energy": 23.8 }
      ]
    }
  ],
  "notes": null,
  "schemaVersion": 1
}
```

The numeric values above are **illustrative** : they show the expected
shape, not a numeric ground truth. The JSON you send back is whatever
your tool actually produces.

### Cross-validation procedure on our side (no AI)

Once your file lands, here's exactly what happens — **no step calls any
AI model or external service** :

1. **Schema validation.** JSON goes through our `user-case-schema`
   parser (Zod). Any missing/mistyped field comes back to you with the
   exact path and offending value.
2. **Unit conversion.** If `sourceUnitsNote` indicates inches / ft/s /
   inHg, we convert to canonical units (m, mm, m/s, absolute hPa, °C).
   **No extrapolation** : if conversion loses precision, a warning is
   logged.
3. **Engine run.** `calculateTrajectory(inputs)` produces our own
   row-by-row table, **at the exact distances you provided** — no
   engine-side interpolation.
4. **Comparison.** The `compareReference` harness aligns your rows to
   ours and computes `Δabs` and `Δrel` per metric. Default tolerances
   versioned in `tolerances.ts` :
   - drop : ±2 mm OR ±2 % (most permissive)
   - velocity : ±2 m/s OR ±1 %
   - TOF : ±5 ms OR ±2 %
   - wind drift : ±3 mm OR ±5 %
   - energy : ±0.5 J OR ±2 %
5. **Verdict.**
   - `PASS` : 100 % within tolerance AND source confidence ≥ B.
   - `INDICATIVE` : all within tolerance but confidence = C, or no
     metric actually comparable (honest degenerate case).
   - `FAIL` : ≥ 1 comparison out of tolerance — I investigate and come
     back with the exact diff.
6. **Bilingual FR/EN report** auto-generated (markdown) with inputs,
   engine outputs, per-row deltas, and a verdict. I send the report
   back, **without silently editing the engine**. Any engine evolution
   triggered by a discrepancy is an explicit human decision, motivated
   by **at least two concordant sources**.

### What we DO NOT do

- ❌ No automatic update of golden snapshots on discrepancy.
- ❌ No rewriting of your values (no "correction", smoothing, silent
  rounding).
- ❌ No AI in the extraction or comparison chain.
- ❌ No exclusivity expectation — share the same cases with anyone.

### What I'm asking you concretely

- **1 case is enough** to start. The ideal matrix (8 cases spanning
  .177 / .22 / .25 / .30, pellet vs slug, ICAO vs cold/hot/altitude/
  crosswind) is documented in `docs/handoff/golden-cases-request.md`
  but **no row is required**.
- Format : 1 JSON file per case, named `<caseId>.json`.
- Reply channel : {{CONTACT_CHANNEL}}.
- Reference repo (read-only) : {{REPO_OR_LINK}}.

No reciprocity expected, no support commitment. Our application code
and cross-validation fixtures are open — feel free to reuse them for
your own validation needs.

Thanks in advance,
{{YOUR_NAME}}

<<< END MESSAGE (EN)

---

## 3. Notes for the sender (do NOT include in the message)

- Do not paste the canonical schema reference inline if the recipient is
  technical and the message above is already long enough — instead point
  them at `docs/validation/external-case-json.md` in {{REPO_OR_LINK}}.
- The worked example uses **plausible-but-fake** numeric values for
  `.22 JSB 18.13 gr @ 280 m/s zero 30 m`. Do **not** present them as a
  reference truth — they exist only to lock the schema shape in the
  reader's head.
- If the recipient pushes back on JSON (e.g. "I can only give you a
  CSV"), accept the CSV — we already have a CSV loader
  (`parseExternalReferenceCsv`) and will assemble the JSON ourselves
  with documented assumptions. The point is the **data**, not the file
  extension.
- Confidence grade : when in doubt, set `"confidence": "B"`. Reserve
  `"A"` for clean programmatic exports of an identified version, and
  `"C"` for indicative-only readings (pixel-eye from UI without export).
- After receiving a case, the next concrete step on our side is to drop
  the file in `src/lib/__fixtures__/cross-validation/<case-id>/case.json`
  and run `vitest run src/lib/cross-validation/`. The bilingual report
  generator (`scripts/generate-conformity-report.ts`) then produces the
  reply artifact.

---

## 4. Why this template is separate from `golden-cases-request.md`

- `golden-cases-request.md` is a **rationale & coverage** document : it
  explains *why* we want golden cases, lists the ideal matrix, sets the
  rules of engagement. It is intended for an internal reader or for a
  recipient who already agreed to help.
- This file is a **first-touch outreach artifact** : self-contained,
  embeds a concrete worked example, and explicitly walks through the
  no-AI cross-validation procedure so a cold recipient can decide in
  one read whether to engage.

Both can coexist. They never need to be merged.