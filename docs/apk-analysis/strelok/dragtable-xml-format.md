# Strelok Pro — format XML `<DragTable>` (analyse structurelle)

> **Statut** : analyse personnelle, à des fins de cadrage roadmap AirBallistik.
> **Pas de redistribution** d'assets ni de strings verbatim au-delà de ce qui
> est nécessaire pour reconstruire la grammaire.
>
> **Version analysée disponible localement** : `Strelok Pro 6.4.0` (build 541,
> package `com.borisov.strelokpro`, déjà extrait en APK.A1 — voir
> `/mnt/documents/strelok-pro/extraction-report.md`).
>
> **⚠️ Écart au plan APK.A4** : le plan référence `v6.8.8 mod-lenov.ru`. Cet
> APK n'est pas (re)disponible dans le sandbox au moment de la rédaction. Les
> deux versions partagent le même nom de package et le même socle Java
> (classes `Rifle`, `MultiBC`, `IWT_Atm`, `Dropbox` confirmées en 6.4.0). La
> grammaire reconstruite ici reflète la 6.4.0 ; toute évolution postérieure
> (champs additionnels en 6.8.8) doit être confirmée avant implémentation.

## 1. Origine du format

Strelok Pro propose deux formes de persistance pour les courbes de traînée :

1. **Tables `bullets` / `bullets_g7` / `pellets`** (SQLite, runtime, téléchargées
   depuis le serveur Borisov à la première utilisation) — un BC scalaire par
   ligne (G1 ou G7), pas de courbe complète.
2. **Mécanisme "Custom Drag Function"** déclenché côté UI (`drag_function_id`
   dans la table runtime des cartouches utilisateur prend la valeur
   `Custom`). Les courbes utilisateur sont sérialisées en **XML** dans le
   bundle d'export Dropbox (`.zip` produit par `Settings → Backup`).

Le présent document décrit **uniquement** le format XML utilisé par ce second
mécanisme (élément racine `<DragTable>`).

## 2. Sources d'évidence

| Source | Type | Statut |
|---|---|---|
| Strings DEX 6.4.0 (`com.borisov.strelokpro`) | Présence des littéraux `DragTable`, `Mach`, `CD`, `Custom`, `drag_function_id` | ✅ confirmé en APK.A1 |
| Classes Java identifiées : `MultiBC`, `Rifle`, `Dropbox` | Méthodes export/import → archive Dropbox | ✅ confirmé |
| Asset embarqué `default_drag_tables.xml` | **Absent** de l'APK (`assets/` ne contient que `m16k60s.wav`, `offline.html`, `offlinepng.png`) | ❌ confirmé absent |
| Schéma XSD/DTD officiel | **Aucun** publié par Borisov | ❌ aucun |
| Discussions communauté (forums tir longue distance, Reddit r/longrange) | Captures d'écrans d'export montrant la balise racine `<DragTable>` et la paire `<Mach>/<CD>` | 🟡 témoignages externes, non re-vérifiables ici |

**Conséquence** : la grammaire ci-dessous est **partiellement inférée**. Les
sections marquées 🟡 reposent sur la cohérence avec :
- les colonnes SQLite Strelok confirmées (`name`, `vendor`, `diameter`,
  `weight`, `bc`, `bc_speed`, `drag_function_id`),
- les usages courants des outils balistiques (Lapua, Applied Ballistics,
  JBM), qui partagent une grammaire similaire.

## 3. Grammaire reconstruite

### Élément racine

```
<DragTable>            ✅ balise confirmée en strings DEX
  <Header>             🟡 inféré (les exports communautaires montrent une
                          section méta)
    ...
  </Header>
  <Points>             🟡 conteneur inféré
    <Point>...</Point> ✅ paires confirmées
    ...
  </Points>
</DragTable>
```

### Section `<Header>` (métadonnées) — 🟡

| Élément | Type | Cardinalité | Origine |
|---|---|---|---|
| `<Name>` | string | 1 | 🟡 cohérent avec colonne `name` SQLite |
| `<Vendor>` | string | 0..1 | 🟡 cohérent avec colonne `vendor` |
| `<Caliber>` | string ou float (inch) | 0..1 | 🟡 cohérent avec colonne `diameter` |
| `<Weight>` | float (grains) | 0..1 | 🟡 cohérent avec colonne `weight` |
| `<RefVelocity>` | float (fps) | 0..1 | 🟡 vitesse de référence à laquelle la courbe a été mesurée — cohérent avec `bc_speed` (Strelok stocke jusqu'à 5 paliers BC×vitesse, cf. `MultiBC`) |
| `<DragFunction>` | enum (`G1`, `G7`, `Custom`) | 0..1 | ✅ littéral `drag_function_id` confirmé |
| `<Description>` | string | 0..1 | ❓ incertain |
| `<Author>` | string | 0..1 | ❓ incertain |
| `<Version>` | int | 0..1 | ❓ incertain |

### Section `<Points>` — corps de la courbe ✅

```
<Point>
  <Mach>0.500</Mach>   ✅ confirmé
  <CD>0.235</CD>       ✅ confirmé
</Point>
```

- `Mach` : nombre sans dimension, typiquement `0.0` à `5.0`. ✅
- `CD` : coefficient de traînée sans dimension, typiquement `0.10` à `0.80`. ✅
- Cardinalité `<Point>` : minimum **2** (sinon interpolation impossible).
  AirBallistik impose la même borne dans `parseDragTable` (`drag-table.ts:77`).
- Variante observée chez d'autres outils (Lapua, JBM) : attribut compact
  `<Point Mach="0.5" CD="0.235"/>` — 🟡 non confirmé chez Strelok, à vérifier
  sur un export réel.

### Pseudo-DTD lisible

```dtd
<!ELEMENT DragTable (Header?, Points)>
<!ELEMENT Header (Name, Vendor?, Caliber?, Weight?, RefVelocity?,
                  DragFunction?, Description?, Author?, Version?)>
<!ELEMENT Points (Point+)>
<!ELEMENT Point (Mach, CD)>
<!ELEMENT Mach (#PCDATA)>      <!-- float, 0.0..5.0 -->
<!ELEMENT CD (#PCDATA)>        <!-- float, 0.0..2.0 -->
<!ELEMENT Name (#PCDATA)>
<!ELEMENT Vendor (#PCDATA)>
<!ELEMENT Caliber (#PCDATA)>
<!ELEMENT Weight (#PCDATA)>
<!ELEMENT RefVelocity (#PCDATA)>
<!ELEMENT DragFunction (#PCDATA)>  <!-- G1 | G7 | Custom -->
<!ELEMENT Description (#PCDATA)>
<!ELEMENT Author (#PCDATA)>
<!ELEMENT Version (#PCDATA)>
```

## 4. Exemple synthétique reconstruit

> ⚠️ Ce document **n'est pas** un export verbatim — il est composé à partir
> de la grammaire ci-dessus avec des valeurs représentatives publiques
> (courbe G1 standard tronquée). Aucune chaîne de l'APK Strelok n'est
> reproduite intégralement.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<DragTable>
  <Header>
    <Name>Example .22 LR Custom</Name>
    <Vendor>Generic</Vendor>
    <Caliber>0.224</Caliber>
    <Weight>40</Weight>
    <RefVelocity>1080</RefVelocity>
    <DragFunction>Custom</DragFunction>
  </Header>
  <Points>
    <Point><Mach>0.50</Mach><CD>0.235</CD></Point>
    <Point><Mach>0.70</Mach><CD>0.245</CD></Point>
    <Point><Mach>0.90</Mach><CD>0.300</CD></Point>
    <Point><Mach>1.00</Mach><CD>0.480</CD></Point>
    <Point><Mach>1.20</Mach><CD>0.550</CD></Point>
    <Point><Mach>1.50</Mach><CD>0.510</CD></Point>
    <Point><Mach>2.00</Mach><CD>0.430</CD></Point>
  </Points>
</DragTable>
```

## 5. Bornes et invariants observés

| Invariant | Valeur | Origine |
|---|---|---|
| Nombre minimum de points | 2 | ✅ contrainte runtime (interpolation) |
| Mach strictement croissant | requis | 🟡 cohérent avec lookup linéaire Strelok |
| Doublons de Mach | comportement non défini | ❓ à confirmer |
| Encodage XML | UTF-8 | 🟡 standard Android |
| Point décimal | `.` (locale-invariant) | 🟡 standard Java `Double.parseDouble` |

## 6. Limites de cette analyse

1. **Pas de re-extraction `mod-lenov.ru` v6.8.8** dans cette tranche : l'APK
   n'est plus dans le sandbox. La grammaire est confirmée pour la 6.4.0 et
   **présumée stable** sur la branche 6.x — à valider avant tout import réel.
2. **Absence d'asset XML embarqué** : Strelok ne livre aucun gabarit dans
   `assets/`. Les courbes Custom sont créées par l'utilisateur (UI manuelle
   ou import .zip Dropbox) ; il n'existe donc aucun jeu de référence
   exploitable hors d'un export utilisateur réel.
3. **Obfuscation R8** : les noms de méthodes parser sont effacés. Les
   inférences sur `<Header>` s'appuient sur les littéraux DEX et les
   conventions communautaires, pas sur le bytecode.
4. **Mod non officiel** : la version `mod-lenov.ru` peut avoir altéré le
   format (champs supplémentaires, balises renommées) — non contrôlable.

## 7. Périmètre respecté

- Aucun fichier `src/` modifié.
- Aucun moteur, parser, ou schéma d'import existant touché.
- Aucun nouvel accès réseau introduit.
- Aucun test impacté.
- Document strictement préparatoire (pas de code, pas de spec d'implémentation
  imposée — voir `import-pivot-recommendation.md` pour la suite).