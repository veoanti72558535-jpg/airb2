# Tranche PLAN — Validation comparative moteur balistique

## Intent

Scope strict : produire le **cadrage** d'une tranche de validation comparative du moteur AirBallistik contre des références externes. **Aucun code dans cette tranche** — uniquement protocole, cas, sources, tolérances, format de rapport. Le BUILD viendra en Priorité 2.

## Pourquoi maintenant

L'existant offre déjà :
- `truth-set.ts` — 15 cas, mais **références internes** (snapshots legacy), pas externes
- `golden.test.ts` + snapshots — non-régression *self*, pas validation tierce
- `cross-profile.test.ts` — delta legacy ↔ MERO, informatif, pas vs vérité externe

**Trou identifié** : aucun test ne compare AirBallistik à une source tierce reconnue (JBM, StrelokPro, ChairGun, MERO publié). Sans cela, les gates MERO (cf. `mem://constraints/mero-exposure-gates` §3) restent bloqués et la confiance produit plafonne au "non-régression interne".

## Livrables de la tranche PLAN (documents uniquement)

Un seul document : `docs/validation/engine-cross-validation-spec.md` couvrant 5 sections.

### 1. Protocole

- **Black-box** : on alimente AirBallistik et la référence avec **les mêmes inputs normalisés** (MV, BC, dragModel, sight height, zero, atmosphère ICAO ou réelle, vent), on compare **les sorties trajectoire** à des distances fixes.
- **Profil testé** : `legacy` d'abord (gel produit), `mero` ensuite (déblocage gates).
- **Zone de comparabilité** : 0 à 150 m airgun. Au-delà, transitions transsoniques → tolérances explicitement relâchées ou exclues.
- **Hors scope** : Coriolis, slope, truing (non implémentés côté AirBallistik V1).

### 2. Cas de test (matrice)

15 à 20 entrées couvrant la matrice :

| Axe | Valeurs |
|---|---|
| Calibre | .177 / .22 / .25 / .30 |
| Type | pellet / slug |
| MV | 200 / 280 / 320 m/s |
| Zero | 25 / 50 / 100 m |
| Atmosphère | ICAO std / chaud-humide / froid-sec / altitude 1500 m |
| Vent | 0 / 5 m/s à 90° |
| Drag law | G1 / G7 / GS |

Réutilisation directe des inputs `truth-set.ts` + `golden/fixtures.ts` quand pertinents (pas de duplication).

### 3. Sources de comparaison

Hiérarchie de confiance (du plus fort au plus faible) :

| Rang | Source | Mode d'extraction | Coût |
|---|---|---|---|
| A | **JBM Ballistics** (web) | Saisie manuelle inputs → CSV résultat copié | 1-2 h/cas |
| B | **StrelokPro** (APK) | Captures écran tableau, OCR ou re-saisie | 30 min/cas |
| C | **ChairGun Elite** (APK) | Idem StrelokPro | 30 min/cas |
| D | **MERO** (APK) | Idem (référence pour profil `mero` uniquement) | 30 min/cas |
| E | Snapshot legacy AirBallistik | Existant — sert de **non-régression**, pas de vérité | 0 |

**Règle "deux sources"** : un cas est promu "validé" si **au moins 2 sources de rang A-D** s'accordent (delta < tolérance source). Sinon → marqué "indicatif".

Sources stockées en CSV versionnés sous `src/lib/__fixtures__/cross-validation/sources/`, une feuille par référence externe, format identique pour faciliter le diff.

### 4. Tolérances

Par profil et par grandeur, alignées avec `PROFILE_TOLERANCE` existant :

| Profil | Drop | Vélocité | Vent (mm) | TOF |
|---|---|---|---|---|
| legacy vs ref externe | 8 % ou ±5 mm | 5 % | ±10 mm @ 100 m | 5 % |
| mero vs ref externe | 5 % ou ±3 mm | 3 % | ±5 mm @ 100 m | 3 % |

**Justification écarts plus larges qu'en interne** : intégrateur, table Cd et atmosphère ne sont pas identiques entre apps — un delta < tolérance ne prouve pas "même physique", il prouve "convergence acceptable produit". Au-delà → investigation, pas échec automatique.

**Zone transsonique (Mach 0.8–1.2)** : tolérance × 2. À justifier dans le rapport, pas masquée.

### 5. Format de rapport

Auto-généré par le harness (Priorité 2), commité comme artefact :

`docs/validation/engine-cross-validation-report.md` :

```text
# Cross-validation report — Engine vs External References
Generated: <date> | Profile: legacy | Cases: N | Pass: X | Indicative: Y | Fail: Z

## Case 22-jsb-18gr-280-zero30
| range | airBal | JBM | StrelokPro | maxΔ | tol | status |
|-------|-------:|----:|-----------:|-----:|----:|:------:|
| 30    | 0.0    | 0.0 | -0.1       | 0.1  | 5mm | PASS   |
| 50    | -28.4  | -27.9| -28.7     | 0.5  | 8%  | PASS   |
| 100   | ...    | ... | ...        | ...  | ... | ...    |

Sources cited: JBM (manual entry 2026-04-20), StrelokPro v6.x APK
Notes: transition Mach 0.92 @ 80m — tolerance doubled
```

Plus un `summary.json` machine-lisible pour intégration future CI.

## Critères d'acceptation de la tranche PLAN

1. ✅ Document `engine-cross-validation-spec.md` rédigé, ≤ 600 lignes
2. ✅ Matrice de cas définie (15-20 entrées identifiées par id stable)
3. ✅ Sources hiérarchisées avec coût d'extraction estimé
4. ✅ Tolérances chiffrées par profil et par grandeur, écart transsonique justifié
5. ✅ Format de rapport spécifié (markdown + JSON)
6. ✅ Aucun code modifié, aucun test ajouté
7. ✅ Référence explicite à `mem://constraints/mero-exposure-gates` §3 (gate déblocable par cette tranche)

## Ce qui NE fait PAS partie de la tranche PLAN

- Création du harness de test → Priorité 2
- Saisie effective des données externes (JBM, StrelokPro) → Priorité 2
- Snapshots CSV de référence → Priorité 2
- Déblocage UI MERO → suite Priorité 2 + autres gates §1, §2, §4

## Fichiers prévus

**Créés** :
- `docs/validation/engine-cross-validation-spec.md`

**Modifiés** : aucun.

**Supprimés** : aucun.
