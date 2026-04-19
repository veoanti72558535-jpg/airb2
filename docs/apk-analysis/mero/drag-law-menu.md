# MERO 1.2.5 — énumération exhaustive du menu drag law (APK.A3)

> **Cadre légal** — Cartographie structurelle interne, sans extraction de
> code propriétaire. Les noms `dlG1` … `dlSLG1` sont des **identifiants
> Java/Kotlin observés en string-pool DEX** ; aucune table Cd numérique
> n'est reproduite ici. AirBallistik **n'intégrera pas** ces drag laws en
> V1 ; le verrou MERO reste actif (cf. `mem://constraints/mero-exposure-gates`).

## 1. Méthode

Source unique : `strings classes.dex classes2.dex` issus de
`com.gpc.mero.apk` (split base du bundle `MERO_1.2.5_APKPure-2.xapk`).

Trois axes recoupés :

1. **Lambdas `showDragLawMenu$N`** — handlers Java générés par le compilateur
   pour chaque entrée du menu Android `PopupMenu`.
2. **Identifiants `dl<LAW>`** — noms de variables / constantes désignant
   chaque loi.
3. **Phrases produit observées** — la phrase de référence
   citée par l'auteur dans le manuel intégré (`6) Open MERO and enter…`)
   donne la cartographie famille → loi.

## 2. Lambdas observées

Trois écrans MERO exposent un menu de drag law, avec des comptes de
handlers cohérents :

| Écran (classe) | Plage `lambda$showDragLawMenu$N` | Nombre |
|----------------|----------------------------------|--------|
| `com.gpc.mero.MainActivity` | `131` → `138` | **8** |
| `com.gpc.mero.EasyBC` | `48` → `55` | **8** |
| `com.gpc.mero.EditProjectile` | `29` → `35` | **7** |

→ MainActivity et EasyBC exposent le **menu complet (8 entrées)**.
EditProjectile exposerait **7 entrées** (très probablement la liste sans
l'entrée "annuler/cancel" ou sans la loi par défaut implicite — non
vérifiable sans désassemblage). Cette divergence est une **incertitude
marquée ❓** ci-dessous.

## 3. Identifiants des drag laws (string-pool DEX)

Les chaînes suivantes apparaissent une seule fois chacune dans la pool,
toutes préfixées par `dl` (drag law) :

```
dlG1
dlG7
dlGA
dlGA2
dlGS
dlRA4
dlSLG0
dlSLG1
```

→ **8 identifiants** = correspond exactement au nombre de handlers du
menu complet (MainActivity, EasyBC). C'est la liste exhaustive certaine.

Confirmation indirecte par les commentaires-strings :

- `Added SLG0 slug profile`
- `added SLG1 drag law`
- `Ballisticboy's experimental slug profile`
- `Ballisticboy's experimental boat-tailed slug profile`
- `Chairgun's contender for Round-nosed diabolo Airgun pellets`
- `Ballisticboy's contender for Round-nosed diabolo Airgun pellets`
- `Smooth Sphere`

## 4. Tableau exhaustif du menu drag law

| # | Identifiant | Famille | Description observée (anglais MERO) | Cas d'usage attendu | Statut |
|---|-------------|---------|-------------------------------------|---------------------|--------|
| 1 | `dlG1` | Standard | (générique standard) | "just about everything else" | ✅ certitude |
| 2 | `dlG7` | Standard | (boat-tail standard) | projectiles boat-tail long range (centerfire) | ✅ certitude |
| 3 | `dlGA` | Airgun | "Chairgun's contender for Round-nosed diabolo Airgun pellets" | diabolo airgun standard | ✅ certitude |
| 4 | `dlGA2` | Airgun | "Ballisticboy's contender for Round-nosed diabolo Airgun pellets" | diabolo airgun (alternative MERO) | ✅ certitude |
| 5 | `dlGS` | Sphérique | "Smooth Sphere" | balles sphériques (BB, plombs ronds) | ✅ certitude |
| 6 | `dlRA4` | Rimfire | (rimfire standard) | ".22 Rimfire" (cf. phrase produit) | ✅ certitude |
| 7 | `dlSLG0` | Slug | "Ballisticboy's experimental slug profile" | slugs airgun (round-nose) | ✅ certitude |
| 8 | `dlSLG1` | Slug | "Ballisticboy's experimental boat-tailed slug profile" | slugs airgun boat-tail | ✅ certitude |

## 5. Cartographie famille → cas d'usage

Issue de la **phrase produit canonique** (manuel intégré MERO) :

> « select a suitable drag law (**GA or GA2** for diabolo Airgun pellets,
> **RA4** for 0.22 Rimfire, **GS** for spherical projectiles and
> **G1** for just about everything else). »

Famille | Lois MERO | Lecture produit
--------|-----------|----------------
Diabolo airgun | `GA`, `GA2` | Deux contenders (Chairgun vs Ballisticboy) — l'utilisateur choisit selon l'usine pellet
Slugs airgun | `SLG0`, `SLG1` | Deux profils expérimentaux (round-nose vs boat-tail)
Rimfire .22 | `RA4` | Loi dédiée (la phrase produit ne mentionne pas RA0/RA1/RA2/RA3 → soit unique, soit famille interne non exposée)
Sphérique | `GS` | Smooth Sphere (BB, plombs ronds)
Centerfire boat-tail | `G7` | Implicite (présent dans le menu, pas mentionné dans la phrase)
Générique | `G1` | « catch-all », valeur par défaut probable

### Notes sur la famille `RA*`

L'analyse APK.A2 avait évoqué l'existence possible des lois `RA0/RA1/RA2/RA3`
aux côtés de `RA4`. **L'analyse APK.A3 ne confirme pas** leur présence
côté UI : seule `dlRA4` apparaît en string-pool. Soit ces lois sont
**internes au moteur** (utilisées par `RA4` comme courbes auxiliaires),
soit elles ont été **supprimées dans la version 1.2.5**. À noter pour
APK.A4 si une comparaison de versions MERO devient pertinente.

## 6. Comparaison synthétique avec AirBallistik

| Loi MERO | Statut AirBallistik | Notes |
|----------|---------------------|-------|
| `dlG1` | ✅ **public** (`PUBLIC_DRAG_LAWS` dans `src/lib/drag-law-policy.ts`) | Loi par défaut, V1, surfaces UI |
| `dlG7` | ✅ **public** | V1, présente dans `dragLawsAvailable` du profil legacy |
| `dlGA` | ✅ **public** | V1, exposée |
| `dlGS` | ✅ **public** | V1, exposée |
| `dlGA2` | 🟡 **interne** (`INTERNAL_DRAG_LAWS`) | Présente dans la table mero (`mero-tables.ts`), gating MERO actif |
| `dlRA4` | 🟡 **interne** | Idem, hors UI publique |
| `dlSLG0` | 🟡 **interne** | Idem |
| `dlSLG1` | 🟡 **interne** | Idem |

→ La séparation **publique / interne** dans `drag-law-policy.ts` est
parfaitement alignée avec la cartographie observée :

- AirBallistik **expose les 4 lois "généralistes"** (G1, G7, GA, GS) qui
  couvrent ~80 % des cas d'usage airgun + sphérique + standard.
- AirBallistik **garde verrouillées les 4 lois MERO-spécifiques** (GA2,
  RA4, SLG0, SLG1) qui exigent : inventaire projectile dédié (slugs
  vs diabolos), tests cross-profile (cf. `cross-profile-deltas.md`),
  et désinhibition explicite (cf. `mero-exposure-gates`).

Cette séparation est **conceptuellement saine** et conforme à la
convention « beta tant que non-validé numériquement » du `MERO_PROFILE`
(`profiles.ts`, `beta: true`).

## 7. Cas EditProjectile (7 lambdas vs 8 ailleurs)

❓ **Hypothèses** sur les 7 entrées (vs 8 dans le menu plein) :

1. **Hypothèse "sphère masquée"** — `dlGS` (Smooth Sphere) absent du menu
   par projectile parce que la « sphère » se choisit au niveau setup,
   pas au niveau projectile. Vraisemblance : moyenne.
2. **Hypothèse "G7 masqué"** — MERO étant orienté airgun, `dlG7` peut
   être absent du sélecteur projectile (rarement utile pour pellets).
   Vraisemblance : moyenne.
3. **Hypothèse "annuler/cancel masqué"** — la 8ème entrée des autres
   menus est en réalité un item d'annulation, pas une loi. Vraisemblance :
   faible (les noms sont alignés `48..55`, `131..138`, suggérant 8 lois).

Aucune des trois hypothèses n'est vérifiable sans désassemblage du corps
des méthodes. **Ne pas se baser sur ce point pour une décision produit
AirBallistik.**

## 8. Persistance et sérialisation observée

Templates de format observés en string-pool :

- `DragLaw=%d` → MERO sérialise la drag law sous forme **d'entier
  ordinal** (probablement 0..7 dans l'ordre de `dlG1` … `dlSLG1`).
- `Drag Law (%s)` → l'affichage dans la table balistique reprend le
  **nom court** (`G1`, `GA2`, etc.).
- `Current Drag Law: ` → label statut.

→ AirBallistik utilise une **string typée** (`DragModel` union literal),
ce qui est **plus robuste** que l'ordinal de MERO (un changement d'ordre
casse la persistance MERO ; AirBallistik est immunisé).

## 9. Bilan

| Point | Statut |
|-------|--------|
| Liste exhaustive des entrées du menu drag law MERO | ✅ **8 lois confirmées** (`G1, G7, GA, GA2, GS, RA4, SLG0, SLG1`) |
| Identifiants techniques | ✅ `dl<LAW>` confirmés en string-pool |
| Familles fonctionnelles | ✅ confirmées via la phrase produit canonique |
| Cartographie vers AirBallistik | ✅ alignée avec `PUBLIC_DRAG_LAWS` / `INTERNAL_DRAG_LAWS` |
| Sous-famille `RA0..RA3` | 🟡 **non confirmée** dans MERO 1.2.5 (seul `RA4` exposé) |
| Divergence EditProjectile (7 entrées) | ❓ **incertitude marquée** — hypothèses non vérifiables sans désassemblage |
| Tables Cd numériques | **non extraites** — hors scope (propriétaire) |
| Recommandations produit V2 AirBallistik | **aucune à ce stade** — la séparation publique/interne actuelle est correcte |

## 10. Suite envisageable (hors périmètre A3)

- **APK.A4** (si décidée) : extraction documentaire ciblée Strelok Pro
  format `<DragTable>` XML, en vue d'une éventuelle compatibilité
  d'import custom drag table.
- **Aucune action côté `src/`** n'est requise ou recommandée à l'issue
  de cette tranche. La politique `drag-law-policy.ts` reste la source
  de vérité unique pour l'exposition publique des drag laws.