# Section & ResultsCard — Reuse Guide for FieldMode / ScopeView

> **Audience:** developers extending `FieldModePage` and `ScopeViewPage`.
> **Status:** stable — both components are the source of truth referenced by
> the Claude Design handoff and rendered live at `/design-system`.
> **Last reviewed:** with QuickCalc parity at v1.

---

## 1. Why this guide exists

`Section` and `ResultsCard` were designed for QuickCalc — a **dense
desktop-first form** with cards stacked in a single scroll column. FieldMode
and ScopeView have very different constraints:

| Page             | Primary device              | Lighting        | Hand posture     | Time-on-screen |
| ---------------- | --------------------------- | --------------- | ---------------- | -------------- |
| QuickCalc        | Desktop / tablet            | Indoor          | Two hands        | Minutes        |
| **FieldMode**    | Phone, mounted or pocket    | Bright sun      | One thumb        | Seconds        |
| **ScopeView**    | Tablet / desktop split-view | Dim / nighttime | Both hands       | Long sessions  |

Reusing the QuickCalc components in those contexts **without adapting their
density, color and touch contracts** will degrade legibility (sun) or
night-vision adaptation (scope). This document defines the contracts.

---

## 2. Component contracts (recap)

### 2.1 `Section` — `src/components/calc/Section.tsx`

```tsx
<Section
  icon={LucideIcon}        // required, rendered in a 24px chip
  title="…"                // required
  description="…"          // optional, 11px muted under the title
  action={<Switch …/>}     // optional, right-aligned in the header
  variant="default" | "advanced"  // 'advanced' adds primary tint + border
  collapsible              // header becomes clickable, chevron rotates
  defaultOpen
>
  {children}
</Section>
```

Key visual facts:

- Outer surface: `rounded-xl border bg-card/60 backdrop-blur-sm` → uses
  **glass / blur**. This is fine indoors; **fails in bright sunlight**.
- Title font: `text-sm font-heading font-semibold`.
- Inner padding: `p-4` header, `px-4 pb-4 space-y-2.5` body.
- Icon chip: `p-1.5 rounded-md bg-primary/10 text-primary` (or `/15` for
  `advanced`).
- Action slot stops click propagation — safe for `Switch`, buttons, etc.

### 2.2 `ResultsCard` — `src/components/calc/ResultsCard.tsx`

```tsx
<ResultsCard
  result={BallisticResult}        // required — hero row
  rows={BallisticResult[]}        // optional — full trajectory table
  clickUnit="MOA" | "MRAD"        // required
  focalPlane="FFP" | "SFP"        // optional
  currentMag={number}             // SFP-only
  magCalibration={number}         // SFP-only
  advanced={boolean}              // surfaces spinDrift, reticleHold
  weather={WeatherSnapshot}       // shows traceability strip
  zeroWeather={WeatherSnapshot}   // adds "zero weather" badge
  energyThresholdJ={number|null}  // colors energy stat as destructive
/>
```

Key visual facts:

- Outer surface: `border-primary/30 bg-gradient-to-br … shadow-lg` —
  **deliberately heavy** (it's the hero in QuickCalc).
- Stat grid: 2 columns × 4 rows, 12px gap.
- Hero number: `font-mono font-semibold text-base` (16px) — surprisingly
  small. Designed to fit 8 cells without scrolling on a 375px viewport.
- Internal `<Stat>` is **not exported** — re-exposing it is the next planned
  refactor when FieldMode adopts ResultsCard.

---

## 3. Reuse matrix

|                          | QuickCalc | **FieldMode**          | **ScopeView**          |
| ------------------------ | --------- | ---------------------- | ---------------------- |
| `Section` as-is          | ✅        | ❌ — too dense, glass  | ⚠️ sidebar only        |
| `Section variant=advanced` | ✅      | ❌                     | ✅ (settings panel)    |
| `Section collapsible`    | ✅        | ❌ — every input must be reachable in 1 gesture | ✅ (ballistic settings) |
| `ResultsCard` full       | ✅        | ❌ — text too small    | ⚠️ overlay only        |
| `ResultsCard` hero only  | n/a       | ✅ via wrapper         | ✅ via wrapper         |
| `ResultsCard rows table` | ✅        | ❌                     | ❌ — covers reticle    |

---

## 4. FieldMode reuse — recipes

### 4.1 Use `Section` only for the **secondary** strip

The hero distance/correction tiles in FieldMode are intentionally bigger
than `Section`'s defaults (5xl–6xl mono, 56px touch targets). Don't try to
squeeze them into a `Section`. **Use `Section` only for the bottom shot
logger and "advanced settings" sheet** — places where density is acceptable.

```tsx
// ✅ OK — Section for the shot logger (low-frequency interaction)
<Section icon={ListChecks} title={t('field.shotLog')}>
  <ShotLoggerButtons />
  <ShotLoggerHistory />
</Section>

// ❌ NOT OK — Section can't hold the 6xl distance stepper readably
<Section icon={Ruler} title="Distance">
  <div className="text-6xl font-mono">{distance}m</div>
</Section>
```

### 4.2 If you must use `Section`, override the surface

Glass + backdrop-blur is illegible in sunlight. Force `surface-elevated`
via the wrapper, **not** by editing `Section.tsx`:

```tsx
<div className="[&>section]:!bg-[hsl(var(--surface))] [&>section]:!backdrop-blur-none [&>section]:!border-border">
  <Section icon={Wind} title={t('field.weather')}>
    …
  </Section>
</div>
```

> **Why not edit `Section`?** QuickCalc relies on the glass look for its
> hero density. The override stays local to FieldMode, preserving QuickCalc.

### 4.3 Adopt a `<FieldHeroResult>` wrapper instead of `ResultsCard`

`ResultsCard` packs 8 stats at 16px. FieldMode needs **2 stats at 4xl**.
Build a thin wrapper that consumes the same `BallisticResult` shape so
future migrations are mechanical:

```tsx
// src/components/field/FieldHeroResult.tsx
import type { BallisticResult } from '@/lib/types';

interface Props {
  result: BallisticResult;
  clickUnit: 'MOA' | 'MRAD';
}

export function FieldHeroResult({ result, clickUnit }: Props) {
  const elev = result.clicksElevation ?? 0;
  const wind = result.clicksWindage ?? 0;
  return (
    <div className="grid grid-cols-2 gap-3">
      <FieldHeroTile
        label={clickUnit === 'MRAD' ? 'Élévation' : 'Élévation'}
        value={`${elev > 0 ? '+' : ''}${elev}`}
        sub={`${result.holdoverMRAD.toFixed(2)} ${clickUnit}`}
        sign={elev}
      />
      <FieldHeroTile
        label="Vent"
        value={`${wind > 0 ? 'R ' : wind < 0 ? 'L ' : ''}${Math.abs(wind)}`}
        sub={`${result.windDrift.toFixed(1)} mm`}
        sign={wind}
        windAxis
      />
    </div>
  );
}
```

The contract is **unchanged**: it still consumes `BallisticResult`, so the
ballistics engine output flows directly in. When `ResultsCard` ships an
exported `<Stat size="hero" />`, swap the inline tile for it.

### 4.4 FieldMode rules — checklist

- [ ] Touch targets ≥ 48px (use `h-14 w-14` for round steppers, `py-3` for buttons).
- [ ] No `glass-card`, no `backdrop-blur-*` classes anywhere.
- [ ] Hero numbers use `font-mono tabular-nums` to lock width.
- [ ] Color encodes data only: `text-green-500` / `text-red-500` for
      elevation sign, `text-blue-500` / `text-orange-500` for wind side.
- [ ] No `Section collapsible` — every control must be reachable in one
      thumb gesture.
- [ ] Avoid `ResultsCard rows={…}` — the trajectory table is unreadable on
      a 375px viewport in sunlight.

---

## 5. ScopeView reuse — recipes

ScopeView intentionally **bypasses the theme** for the canvas-side
chrome — it ships its own raw-hex palette (`#080a0e`, `#161a24`, `#38bdf8`)
to guarantee contrast against the reticle without depending on the
user's theme choice. This is documented as an escape hatch in
`/design-system` → "Scope View rules".

### 5.1 `Section` is allowed in the sidebar only

The 340px sidebar uses theme tokens (it's not over the canvas). `Section`
fits there cleanly **provided** you compact the padding:

```tsx
// Sidebar-friendly Section — same component, custom paddings via wrapper
<div className="[&>section]:p-3 [&_h3]:text-xs">
  <Section icon={Crosshair} title={t('scope.profile')} variant="advanced">
    <ProfilePicker />
  </Section>
</div>
```

### 5.2 `ResultsCard` as a HUD overlay — strip it down

If you want to surface the live drop / hold-over near the reticle, do
**not** drop the full `ResultsCard` — it occludes the optic. Build a
`<ScopeHud>` wrapper that:

1. Consumes `BallisticResult` (same contract).
2. Renders only `holdover` and `windDrift` in the cyan accent.
3. Uses `position: absolute` over the canvas, top-right.
4. Honors the raw-hex palette, NOT theme tokens.

```tsx
// src/components/scope/ScopeHud.tsx
import type { BallisticResult } from '@/lib/types';

export function ScopeHud({
  result, clickUnit,
}: { result: BallisticResult; clickUnit: 'MOA' | 'MRAD' }) {
  const hold = clickUnit === 'MRAD' ? result.holdoverMRAD : result.holdover;
  return (
    <div
      style={{
        position: 'absolute', top: 12, right: 12,
        background: '#0d1017dd', color: '#e2e8f0',
        border: '1px solid #1e2330', borderLeft: '3px solid #38bdf8',
        borderRadius: 8, padding: '8px 10px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
        display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 12px',
      }}
    >
      <span style={{ color: '#64748b' }}>HOLD</span>
      <span style={{ color: '#38bdf8', fontWeight: 600, textAlign: 'right' }}>
        {hold.toFixed(2)} {clickUnit}
      </span>
      <span style={{ color: '#64748b' }}>WIND</span>
      <span style={{ color: '#38bdf8', fontWeight: 600, textAlign: 'right' }}>
        {result.windDrift.toFixed(1)} mm
      </span>
    </div>
  );
}
```

### 5.3 ScopeView rules — checklist

- [ ] Canvas chrome stays on raw hex (`#080a0e`, `#161a24`, `#38bdf8`) —
      do not introduce `bg-card` / `text-primary` over the canvas.
- [ ] Sidebar `Section` allowed; force compact padding via wrapper.
- [ ] No full `ResultsCard` over the canvas — use `<ScopeHud>` overlay.
- [ ] Use `<ResponsivePreview path="/scope-view">` (in `/design-system`)
      to verify no horizontal overflow between 320px and 1440px after any
      sidebar / canvas layout change.
- [ ] Cyan `#38bdf8` for accents (preserves dark adaptation), never the
      amber `--primary`.

---

## 6. Migration roadmap

These are the planned edits to `Section` / `ResultsCard` that will let
FieldMode and ScopeView consume them more directly. None are blocking —
the wrappers above ship today.

| Step | What                                            | Why                                                  | Status |
| ---- | ----------------------------------------------- | ---------------------------------------------------- | ------ |
| M1   | Export `<Stat>` from `ResultsCard.tsx`          | Lets FieldMode reuse the exact tile primitive        | todo   |
| M2   | Add `Section` prop `surface="glass" \| "solid"` | Replaces the brittle `[&>section]` override          | todo   |
| M3   | Add `Section` prop `density="comfortable" \| "compact"` | Replaces the wrapper for ScopeView sidebar    | todo   |
| M4   | Extract a `<HeroResult>` primitive consumed by ResultsCard, FieldHeroResult, ScopeHud | Single source of formatting/rounding rules | todo |

When M1–M4 land, this document should be reduced to a one-paragraph pointer
to the props.

---

## 7. Live preview

- `/design-system` — Section + ResultsCard variants, FieldMode + ScopeView
  UI kits, responsive overflow scanner for `/scope-view`.
- Source files:
  - `src/components/calc/Section.tsx`
  - `src/components/calc/ResultsCard.tsx`
  - `src/pages/FieldModePage.tsx`
  - `src/pages/ScopeViewPage.tsx`
  - `src/pages/DesignSystemPage.tsx`
  - `src/components/devtools/ResponsivePreview.tsx`