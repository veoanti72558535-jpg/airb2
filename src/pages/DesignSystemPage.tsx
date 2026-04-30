import { useState } from 'react';
import {
  Crosshair,
  Gauge,
  Wind,
  Sparkles,
  Layers,
  ChevronUp,
  ChevronDown,
  Sun,
  Hand,
  Eye,
  Maximize2,
  Sliders,
} from 'lucide-react';
import { Section } from '@/components/calc/Section';
import { ResultsCard } from '@/components/calc/ResultsCard';
import { Field } from '@/components/calc/Field';
import { Switch } from '@/components/ui/switch';
import { ResponsivePreview } from '@/components/devtools/ResponsivePreview';
import { BallisticResult, WeatherSnapshot } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/use-units';

/**
 * Internal design-system showcase. Mirrors what Claude Design documents in its
 * UI kit, but rendered live with the real production components so the demo
 * never drifts from the source of truth (Section + ResultsCard).
 *
 * Reachable at /design-system. Intentionally NOT linked from the sidebar —
 * this is a developer/handoff surface, not an end-user feature.
 */
export default function DesignSystemPage() {
  const [collapsibleDemo, setCollapsibleDemo] = useState(true);
  const [vel, setVel] = useState(280);

  // ── Mock ballistic data — realistic .22 PCP @ 25 m ──────────────────────
  const heroResult: BallisticResult = {
    range: 25,
    drop: 12.4,
    holdover: 1.7,
    holdoverMRAD: 0.49,
    velocity: 245,
    energy: 32.8,
    tof: 0.108,
    windDrift: 18.2,
    windDriftMOA: 2.5,
    windDriftMRAD: 0.73,
    spinDrift: 0.6,
    clicksElevation: 7,
    clicksWindage: 10,
  };

  const trajectoryRows: BallisticResult[] = [0, 10, 20, 25, 30, 40, 50].map(r => ({
    range: r,
    drop: -(r * r) * 0.022,
    holdover: r === 0 ? 0 : (r / 25) * 1.7,
    holdoverMRAD: r === 0 ? 0 : (r / 25) * 0.49,
    velocity: 280 - r * 1.4,
    energy: 42 - r * 0.4,
    tof: r * 0.0042,
    windDrift: (r * r) * 0.029,
    windDriftMOA: (r / 25) * 2.5,
    windDriftMRAD: (r / 25) * 0.73,
  }));

  const mockWeather: WeatherSnapshot = {
    temperature: 18,
    pressure: 1013,
    humidity: 62,
    windSpeed: 2.4,
    windAngle: 90,
    altitude: 120,
    timestamp: new Date(Date.now() - 12 * 60_000).toISOString(),
    source: 'auto',
    provider: 'open-meteo',
    location: 'Paris, FR',
  };

  return (
    <div className="container max-w-5xl py-8 space-y-10">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-[11px] font-mono uppercase tracking-widest">
            internal · design system
          </span>
        </div>
        <h1 className="text-2xl font-heading font-bold">AirBallistik UI Kit</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Live preview of <code className="text-primary">Section</code> and{' '}
          <code className="text-primary">ResultsCard</code> — the two anchor
          components of the QuickCalc page. Used as the source of truth for the
          Claude Design handoff prototype. Edit the source files to update this
          page automatically.
        </p>
      </header>

      {/* ── Section variants ───────────────────────────────────────────── */}
      <article className="space-y-4">
        <SubHeader
          title="Section"
          path="src/components/calc/Section.tsx"
          props={['icon', 'title', 'description', 'action', 'variant', 'collapsible', 'defaultOpen']}
        />

        <DemoLabel>variant="default"</DemoLabel>
        <Section
          icon={Gauge}
          title="Vélocité initiale"
          description="Vitesse mesurée au chronographe"
        >
          <Field
            label="Muzzle velocity"
            unit="m/s"
            value={vel}
            onChange={setVel}
          />
        </Section>

        <DemoLabel>variant="default" + action slot</DemoLabel>
        <Section
          icon={Wind}
          title="Conditions météo"
          action={
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Auto
              </span>
              <Switch defaultChecked />
            </div>
          }
        >
          <p className="text-xs text-muted-foreground">
            The <code>action</code> slot lives in the header, right-aligned, and
            does not toggle the section open/closed even when collapsible.
          </p>
        </Section>

        <DemoLabel>variant="advanced"</DemoLabel>
        <Section
          icon={Crosshair}
          title="Paramètres avancés"
          description="Spin drift, Coriolis, Magnus"
          variant="advanced"
        >
          <p className="text-xs text-muted-foreground">
            The <code>advanced</code> variant adds a subtle primary tint and
            border to signal optional / power-user content.
          </p>
        </Section>

        <DemoLabel>collapsible — click the header</DemoLabel>
        <Section
          icon={Layers}
          title="Section repliable"
          description="Cliquer sur l'en-tête pour replier"
          collapsible
          defaultOpen={collapsibleDemo}
          action={
            <button
              type="button"
              onClick={() => setCollapsibleDemo(o => !o)}
              className="text-[10px] text-primary hover:underline"
            >
              reset
            </button>
          }
        >
          <p className="text-xs text-muted-foreground">
            Chevron rotates 180° when open. Header gets <code>cursor-pointer</code>.
          </p>
        </Section>
      </article>

      {/* ── ResultsCard variants ───────────────────────────────────────── */}
      <article className="space-y-4">
        <SubHeader
          title="ResultsCard"
          path="src/components/calc/ResultsCard.tsx"
          props={['result', 'rows', 'clickUnit', 'focalPlane', 'advanced', 'weather', 'energyThresholdJ']}
        />

        <DemoLabel>basic — single hero result</DemoLabel>
        <ResultsCard result={heroResult} clickUnit="MOA" />

        <DemoLabel>with trajectory rows + weather strip</DemoLabel>
        <ResultsCard
          result={heroResult}
          rows={trajectoryRows}
          clickUnit="MRAD"
          weather={mockWeather}
          energyThresholdJ={20}
        />

        <DemoLabel>advanced — spin drift surfaced</DemoLabel>
        <ResultsCard
          result={heroResult}
          rows={trajectoryRows}
          clickUnit="MOA"
          advanced
          weather={mockWeather}
        />

        <DemoLabel>energy over threshold — destructive state</DemoLabel>
        <ResultsCard
          result={{ ...heroResult, energy: 48 }}
          rows={trajectoryRows.map(r => ({ ...r, energy: r.energy + 20 }))}
          clickUnit="MOA"
          energyThresholdJ={40}
        />

        <DemoLabel>dense trajectory table — dual threshold (energy + velocity)</DemoLabel>
        <DenseTrajectoryTableDemo rows={trajectoryRows} />

        <DemoLabel>drop sparkline — inline SVG, threshold band</DemoLabel>
        <DropSparklineDemo rows={trajectoryRows} thresholdMm={50} />

        <DemoLabel>multi-axis chart — drop, wind, energy with threshold markers</DemoLabel>
        <MultiAxisTrajectoryChartDemo rows={trajectoryRows} energyThresholdJ={20} />
      </article>

      <footer className="pt-6 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
        Source-of-truth components live under{' '}
        <code className="text-primary">src/components/calc/</code>. Sync this
        page with Claude Design after any visual change to either component.
        <br />
        Reuse guide for FieldMode / ScopeView:{' '}
        <code className="text-primary">
          docs/handoff/section-resultscard-reuse.md
        </code>
        .
      </footer>

      {/* ── Field Mode UI Kit ─────────────────────────────────────────── */}
      <article className="space-y-4">
        <SubHeader
          title="Field Mode"
          path="src/pages/FieldModePage.tsx"
          props={['session', 'targetDistance', 'shotLog']}
        />

        <Constraints
          items={[
            { icon: Sun, label: 'Outdoor sunlight readability — max contrast, no glass/blur surfaces' },
            { icon: Hand, label: 'One-handed thumb operation — primary controls within 48–56px touch targets' },
            { icon: Maximize2, label: 'Single hero number ≥ 4xl — readable from 50 cm at arm length' },
            { icon: Eye, label: 'Color coding limited to 2 axes (elevation +green/-red, wind R-blue/L-orange)' },
          ]}
        />

        <DemoLabel>distance stepper — 56px round buttons, 6xl readout</DemoLabel>
        <FieldDistanceStepperDemo />

        <DemoLabel>correction tiles — elevation + windage, 4xl mono digits</DemoLabel>
        <FieldCorrectionTilesDemo />

        <DemoLabel>mini stat strip — 4-up secondary metrics</DemoLabel>
        <FieldMiniStatsDemo />

        <DemoLabel>shot logger — semantic green/red, full-width 48px buttons</DemoLabel>
        <FieldShotLoggerDemo />

        <Rules
          title="Field Mode rules"
          rules={[
            'Touch targets MUST be ≥ 48px (use h-14 w-14 round for steppers, py-3 for action buttons).',
            'Use surface-elevated, never glass-card — backdrop blur fails in bright sunlight.',
            'Hero numbers use font-mono tabular-nums to prevent reflow when digits change.',
            'Color is data, not decoration — green/red for elevation sign, blue/orange for windage side.',
            'Avoid icons inside hero numbers; reserve icons for the 9px section labels.',
            'No collapsible sections — every input must be reachable in ≤ 1 thumb gesture.',
          ]}
        />
      </article>

      {/* ── Scope View UI Kit ─────────────────────────────────────────── */}
      <article className="space-y-4">
        <SubHeader
          title="Scope View"
          path="src/pages/ScopeViewPage.tsx"
          props={['reticle', 'magnification', 'targetRange', 'trajectory', 'profileId']}
        />

        <Constraints
          items={[
            { icon: Eye, label: 'Pure black canvas (#080a0e radial) — preserve dark adaptation when sighting' },
            { icon: Sliders, label: 'Sidebar 340px desktop / full-width stacked on mobile (<768px)' },
            { icon: Maximize2, label: 'Canvas auto-sizes 250–800px from available viewport minus chrome' },
            { icon: Wind, label: 'Conditional controls (wind angle appears only when wind speed > 0)' },
          ]}
        />

        <DemoLabel>control group — label + value badge + slider/input</DemoLabel>
        <ScopeControlGroupDemo />

        <DemoLabel>collapsible ballistic settings panel</DemoLabel>
        <ScopeSettingsPanelDemo />

        <DemoLabel>reticle info badge — left-border accent, 4 metadata lines</DemoLabel>
        <ScopeReticleBadgeDemo />

        <DemoLabel>layout split (schematic) — sidebar / viewport</DemoLabel>
        <ScopeLayoutSchematic />

        <DemoLabel>responsive preview — live overflow detector (320 → 1440px)</DemoLabel>
        <ResponsivePreview path="/scope-view" defaultWidth={768} height={620} />

        <Rules
          title="Scope View rules"
          rules={[
            'Background MUST be pure black radial (#080a0e → #12151c) — no theme tokens, never light mode.',
            'Sidebar uses inline styles with raw hex (#161a24, #1e2330) — intentional escape hatch from theme to guarantee canvas-side contrast.',
            'Accent color is cyan #38bdf8 (NOT primary amber) — preserves cones used for low-light vision.',
            'Slider value must be displayed inline with the label (right-aligned, cyan, font-weight 600).',
            'Show advanced ballistic inputs (MV/BC/weight/zero) behind a Settings toggle — keep first-screen sparse.',
            'On mobile (<768px): sidebar stacks above canvas with bottom-border separator and overflow auto.',
            'Use the responsive preview tool above to verify no horizontal overflow at any breakpoint between 320px and 1440px.',
          ]}
        />
      </article>
    </div>
  );
}

function SubHeader({
  title,
  path,
  props,
}: {
  title: string;
  path: string;
  props: string[];
}) {
  return (
    <header className="space-y-1.5 border-l-2 border-primary pl-3">
      <h2 className="text-lg font-heading font-semibold">{title}</h2>
      <div className="text-[11px] font-mono text-muted-foreground">
        <span className="text-primary">{path}</span>
      </div>
      <div className="flex flex-wrap gap-1 pt-1">
        {props.map(p => (
          <span
            key={p}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60"
          >
            {p}
          </span>
        ))}
      </div>
    </header>
  );
}

function DemoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 pt-2">
      ▸ {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Field Mode demos
// ─────────────────────────────────────────────────────────────────────

function FieldDistanceStepperDemo() {
  const [d, setD] = useState(30);
  return (
    <div className="surface-elevated rounded-2xl p-6 text-center space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
        Distance
      </div>
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => setD(v => Math.max(5, v - 5))}
          className="h-14 w-14 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors active:scale-95"
          aria-label="Decrease distance"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <div className="text-6xl font-mono font-bold tabular-nums min-w-[120px]">
          {d}
          <span className="text-lg text-muted-foreground ml-1">m</span>
        </div>
        <button
          onClick={() => setD(v => Math.min(200, v + 5))}
          className="h-14 w-14 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors active:scale-95"
          aria-label="Increase distance"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {[10, 20, 30, 40, 50, 75, 100].map(v => (
          <button
            key={v}
            onClick={() => setD(v)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              d === v
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {v}m
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldCorrectionTilesDemo() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="surface-elevated rounded-2xl p-5 text-center">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
          Élévation
        </div>
        <div className="text-4xl font-mono font-bold tabular-nums text-green-500">
          +7
        </div>
        <div className="text-[10px] text-muted-foreground font-mono mt-1">clics (MRAD)</div>
        <div className="text-xs text-muted-foreground font-mono mt-2 border-t border-border/40 pt-2">
          +0.49 MRAD
        </div>
      </div>
      <div className="surface-elevated rounded-2xl p-5 text-center">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
          <Wind className="h-3 w-3 inline mr-1" />
          Vent
        </div>
        <div className="text-4xl font-mono font-bold tabular-nums text-blue-500">
          R 10
        </div>
        <div className="text-[10px] text-muted-foreground font-mono mt-1">clics (MRAD)</div>
        <div className="text-xs text-muted-foreground font-mono mt-2 border-t border-border/40 pt-2">
          18.2 mm
        </div>
      </div>
    </div>
  );
}

function FieldMiniStatsDemo() {
  // Demo values are kept in SI then formatted via useUnits so the docs
  // surface respects the user's current display preferences (no hardcoded
  // mm / m/s / J literals — the engine truth-set rule applies even here).
  const { display, symbol } = useUnits();
  const stats = [
    { label: 'Chute', value: display('length', 12.4).toFixed(1), unit: symbol('length') },
    { label: 'Vit.', value: display('velocity', 245).toFixed(0), unit: symbol('velocity') },
    { label: 'Énergie', value: display('energy', 32.8).toFixed(1), unit: symbol('energy') },
    { label: 'TdV', value: '0.108', unit: 's' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.label} className="surface-card rounded-xl px-2 py-2 text-center">
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
          <div className="text-sm font-mono font-semibold tabular-nums">
            {s.value}
            <span className="text-[9px] text-muted-foreground ml-0.5">{s.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldShotLoggerDemo() {
  const [log, setLog] = useState<{ hit: boolean; t: string }[]>([]);
  const hits = log.filter(s => s.hit).length;
  return (
    <div className="surface-elevated rounded-2xl p-4 space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium text-center">
        Journal de tir (demo)
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setLog(l => [...l, { hit: true, t: new Date().toLocaleTimeString() }])}
          className="flex-1 py-3 rounded-xl bg-green-500/10 text-green-500 border border-green-500/30 text-sm font-semibold hover:bg-green-500/20 transition-colors active:scale-95"
        >
          ✓ Touché
        </button>
        <button
          onClick={() => setLog(l => [...l, { hit: false, t: new Date().toLocaleTimeString() }])}
          className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 text-sm font-semibold hover:bg-red-500/20 transition-colors active:scale-95"
        >
          ✗ Manqué
        </button>
      </div>
      {log.length > 0 && (
        <div className="text-center text-[10px] text-muted-foreground">
          {hits}/{log.length} touchés ({Math.round((hits / log.length) * 100)}%)
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scope View demos
// ─────────────────────────────────────────────────────────────────────

const SCOPE_BG = '#0d1017';
const SCOPE_PANEL = '#161a24';
const SCOPE_BORDER = '#1e2330';
const SCOPE_TEXT = '#e2e8f0';
const SCOPE_MUTED = '#64748b';
const SCOPE_ACCENT = '#38bdf8';

function ScopeControlGroupDemo() {
  const [range, setRange] = useState(30);
  const [mag, setMag] = useState(10);
  return (
    <div
      style={{
        background: SCOPE_BG,
        border: `1px solid ${SCOPE_BORDER}`,
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <ScopeControl label="Target Range" value={`${range}m`}>
        <input
          type="range"
          min={5}
          max={200}
          value={range}
          onChange={e => setRange(Number(e.target.value))}
          style={{ width: '100%', accentColor: SCOPE_ACCENT }}
        />
      </ScopeControl>
      <ScopeControl label="Magnification" value={`${mag.toFixed(1)}×`}>
        <input
          type="range"
          min={1}
          max={50}
          step={0.5}
          value={mag}
          onChange={e => setMag(Number(e.target.value))}
          style={{ width: '100%', accentColor: SCOPE_ACCENT }}
        />
      </ScopeControl>
    </div>
  );
}

function ScopeSettingsPanelDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: SCOPE_PANEL,
          border: `1px solid ${SCOPE_BORDER}`,
          color: '#94a3b8',
          borderRadius: 6,
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: 13,
          width: 'fit-content',
        }}
      >
        <Sliders size={14} />
        Ballistic Settings {open ? '▲' : '▼'}
      </button>
      {open && (
        <div
          style={{
            background: SCOPE_BG,
            borderRadius: 8,
            padding: 12,
            border: `1px solid ${SCOPE_BORDER}`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {[
            { l: 'MV (m/s)', v: '280' },
            { l: 'BC', v: '0.025' },
            { l: 'Weight (gr)', v: '8.44' },
            { l: 'Zero (m)', v: '30' },
          ].map(f => (
            <div key={f.l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: SCOPE_MUTED, fontWeight: 500 }}>{f.l}</span>
              <input
                defaultValue={f.v}
                style={{
                  background: SCOPE_PANEL,
                  border: `1px solid ${SCOPE_BORDER}`,
                  color: SCOPE_TEXT,
                  padding: '7px 10px',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScopeReticleBadgeDemo() {
  return (
    <div
      style={{
        background: SCOPE_BG,
        borderRadius: 8,
        padding: 12,
        border: `1px solid ${SCOPE_BORDER}`,
        borderLeft: `3px solid ${SCOPE_ACCENT}`,
        fontSize: 12,
        color: SCOPE_MUTED,
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 600, color: SCOPE_TEXT, marginBottom: 4 }}>
        Bushnell Elite Tactical G3
      </div>
      <div>FP: SFP</div>
      <div>Elements: 47</div>
      <div>Unit: MIL</div>
      <div>True Mag: 10×</div>
    </div>
  );
}

function ScopeLayoutSchematic() {
  return (
    <div
      style={{
        display: 'flex',
        height: 220,
        background: '#080a0e',
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${SCOPE_BORDER}`,
      }}
    >
      <div
        style={{
          width: 140,
          background: 'linear-gradient(180deg, #111318 0%, #0d0f14 100%)',
          borderRight: `1px solid ${SCOPE_BORDER}`,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ fontSize: 10, color: SCOPE_ACCENT, fontWeight: 700 }}>SIDEBAR · 340px</div>
        {['Reticle', 'Range', 'Mag', 'Target', 'Wind'].map(l => (
          <div
            key={l}
            style={{
              fontSize: 10,
              color: SCOPE_MUTED,
              background: SCOPE_PANEL,
              padding: '4px 6px',
              borderRadius: 4,
              border: `1px solid ${SCOPE_BORDER}`,
            }}
          >
            {l}
          </div>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          background: 'radial-gradient(ellipse at center, #12151c 0%, #080a0e 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: SCOPE_MUTED,
          fontSize: 11,
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: `2px solid ${SCOPE_ACCENT}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            color: SCOPE_ACCENT,
          }}
        >
          CANVAS
        </div>
        <div style={{ fontSize: 9 }}>auto-sized 250–800px</div>
      </div>
    </div>
  );
}

function ScopeControl({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          fontSize: 12,
          color: SCOPE_MUTED,
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{label}</span>
        {value && <span style={{ color: SCOPE_ACCENT, fontWeight: 600 }}>{value}</span>}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared documentation primitives
// ─────────────────────────────────────────────────────────────────────

function Constraints({
  items,
}: {
  items: { icon: React.ElementType; label: string }[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5"
        >
          <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span className="text-[11px] text-foreground/90 leading-snug">{label}</span>
        </div>
      ))}
    </div>
  );
}

function Rules({ title, rules }: { title: string; rules: string[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </div>
      <ul className="space-y-1.5">
        {rules.map(r => (
          <li
            key={r}
            className="flex items-start gap-2 text-[11px] text-foreground/85 leading-snug"
          >
            <span className="text-primary mt-0.5">▸</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Threshold-aware trajectory visualisations
// ─────────────────────────────────────────────────────────────────────

/**
 * Dense trajectory table — exposes BOTH an energy floor and a velocity floor
 * to demonstrate how multiple thresholds compose visually. Each row paints
 * its breach cell with the destructive token; rows that breach BOTH get a
 * left ring to draw the eye.
 */
function DenseTrajectoryTableDemo({ rows }: { rows: BallisticResult[] }) {
  const { display, symbol } = useUnits();
  const [energyMin, setEnergyMin] = useState(20);
  const [velocityMin, setVelocityMin] = useState(220);

  return (
    <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-border bg-muted/20 text-[11px] font-mono">
        <ThresholdControl
          label="Energy floor"
          unit={symbol('energy')}
          value={energyMin}
          step={1}
          onChange={setEnergyMin}
        />
        <ThresholdControl
          label="Velocity floor"
          unit={symbol('velocity')}
          value={velocityMin}
          step={5}
          onChange={setVelocityMin}
        />
        <span className="ml-auto text-muted-foreground">
          {rows.filter(r => r.energy < energyMin || r.velocity < velocityMin).length} /{' '}
          {rows.length} row(s) below threshold
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wide">
              <th className="text-left py-1.5 px-2">Range</th>
              <th className="text-right py-1.5 px-2">Drop</th>
              <th className="text-right py-1.5 px-2">Wind</th>
              <th className="text-right py-1.5 px-2">Velocity</th>
              <th className="text-right py-1.5 px-2">Energy</th>
              <th className="text-right py-1.5 px-2">TOF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const energyBreach = r.energy < energyMin;
              const velocityBreach = r.velocity < velocityMin;
              const bothBreach = energyBreach && velocityBreach;
              return (
                <tr
                  key={r.range}
                  className={cn(
                    'border-b border-border/30 last:border-0',
                    bothBreach &&
                      'bg-destructive/5 ring-1 ring-inset ring-destructive/30',
                  )}
                >
                  <td className="py-1 px-2 tabular-nums">{r.range}m</td>
                  <td className="text-right py-1 px-2 tabular-nums">
                    {r.drop.toFixed(1)}
                  </td>
                  <td className="text-right py-1 px-2 tabular-nums">
                    {r.windDrift.toFixed(1)}
                  </td>
                  <td
                    className={cn(
                      'text-right py-1 px-2 tabular-nums',
                      velocityBreach &&
                        'bg-destructive/15 text-destructive font-semibold',
                    )}
                    title={
                      velocityBreach
                        ? `${display('velocity', r.velocity).toFixed(0)} < ${display('velocity', velocityMin).toFixed(0)} ${symbol('velocity')}`
                        : undefined
                    }
                  >
                    {r.velocity.toFixed(0)}
                  </td>
                  <td
                    className={cn(
                      'text-right py-1 px-2 tabular-nums',
                      energyBreach &&
                        'bg-destructive/15 text-destructive font-semibold',
                    )}
                    title={
                      energyBreach
                        ? `${r.energy.toFixed(1)} < ${energyMin} J`
                        : undefined
                    }
                  >
                    {r.energy.toFixed(1)}
                  </td>
                  <td className="text-right py-1 px-2 tabular-nums">
                    {r.tof.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border bg-muted/10 text-[10px] font-mono text-muted-foreground">
        <Legend swatch="bg-destructive/15" label="cell breach" />
        <Legend swatch="ring-1 ring-inset ring-destructive/30 bg-destructive/5" label="full-row breach" />
      </div>
    </div>
  );
}

/**
 * Inline SVG sparkline of drop vs range. Renders a translucent destructive
 * band above the threshold and dots breaching points in the destructive
 * token. ~120px tall — designed to live inline next to a stat tile.
 */
function DropSparklineDemo({
  rows,
  thresholdMm,
}: {
  rows: BallisticResult[];
  thresholdMm: number;
}) {
  const W = 480;
  const H = 140;
  const PAD = { l: 36, r: 12, t: 10, b: 22 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const xs = rows.map(r => r.range);
  const ys = rows.map(r => Math.abs(r.drop));
  const xMax = Math.max(...xs, 1);
  const yMax = Math.max(...ys, thresholdMm * 1.2, 1);

  const x = (v: number) => PAD.l + (v / xMax) * innerW;
  const y = (v: number) => PAD.t + innerH - (v / yMax) * innerH;

  const path = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(r.range).toFixed(1)} ${y(Math.abs(r.drop)).toFixed(1)}`)
    .join(' ');

  // Destructive band: drop ABOVE threshold (i.e. y < y(threshold) in SVG).
  const yThreshold = y(thresholdMm);

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between mb-2 text-[11px] font-mono">
        <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
          Drop vs range
        </span>
        <span className="text-destructive">
          threshold {thresholdMm} mm
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Drop sparkline, threshold at ${thresholdMm} mm`}
      >
        {/* destructive band above threshold */}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={innerW}
          height={Math.max(0, yThreshold - PAD.t)}
          fill="hsl(var(--destructive) / 0.08)"
        />
        {/* threshold line */}
        <line
          x1={PAD.l}
          x2={PAD.l + innerW}
          y1={yThreshold}
          y2={yThreshold}
          stroke="hsl(var(--destructive))"
          strokeDasharray="4 3"
          strokeWidth="1"
        />
        {/* axis baseline */}
        <line
          x1={PAD.l}
          x2={PAD.l + innerW}
          y1={PAD.t + innerH}
          y2={PAD.t + innerH}
          stroke="hsl(var(--border))"
        />
        {/* curve */}
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* dots, breach in destructive */}
        {rows.map(r => {
          const breach = Math.abs(r.drop) > thresholdMm;
          return (
            <circle
              key={r.range}
              cx={x(r.range)}
              cy={y(Math.abs(r.drop))}
              r={breach ? 3 : 2}
              fill={breach ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
            />
          );
        })}
        {/* y-axis labels */}
        <text x={4} y={PAD.t + 8} fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="JetBrains Mono">
          {yMax.toFixed(0)}
        </text>
        <text x={4} y={yThreshold + 3} fill="hsl(var(--destructive))" fontSize="9" fontFamily="JetBrains Mono">
          {thresholdMm}
        </text>
        <text x={4} y={PAD.t + innerH} fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="JetBrains Mono">
          0
        </text>
        {/* x-axis ticks */}
        {rows.filter((_, i) => i % 2 === 0).map(r => (
          <text
            key={r.range}
            x={x(r.range)}
            y={H - 6}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            {r.range}m
          </text>
        ))}
      </svg>
    </div>
  );
}

/**
 * Multi-series chart — drop (primary), wind drift (info), energy (warning)
 * normalised to 0–1 each, plotted on a shared range axis. The energy
 * threshold is rendered as a destructive marker on the energy series only.
 * Toggleable series via legend buttons.
 */
function MultiAxisTrajectoryChartDemo({
  rows,
  energyThresholdJ,
}: {
  rows: BallisticResult[];
  energyThresholdJ: number;
}) {
  const [visible, setVisible] = useState({ drop: true, wind: true, energy: true });

  const W = 560;
  const H = 220;
  const PAD = { l: 14, r: 14, t: 14, b: 24 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const xMax = Math.max(...rows.map(r => r.range), 1);
  const x = (v: number) => PAD.l + (v / xMax) * innerW;

  const series = [
    {
      key: 'drop' as const,
      label: 'Drop',
      color: 'hsl(var(--primary))',
      values: rows.map(r => Math.abs(r.drop)),
    },
    {
      key: 'wind' as const,
      label: 'Wind',
      color: 'hsl(var(--info, 200 90% 55%))',
      values: rows.map(r => Math.abs(r.windDrift)),
    },
    {
      key: 'energy' as const,
      label: 'Energy',
      color: 'hsl(var(--warning, 38 92% 50%))',
      values: rows.map(r => r.energy),
    },
  ];

  // Per-series normalisation so all three fit one chart.
  const norm = (vals: number[], v: number) => {
    const max = Math.max(...vals, 1);
    return PAD.t + innerH - (v / max) * innerH;
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {series.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => setVisible(v => ({ ...v, [s.key]: !v[s.key] }))}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border transition-colors',
              visible[s.key]
                ? 'border-border bg-muted/40 text-foreground'
                : 'border-border/50 bg-transparent text-muted-foreground line-through',
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            {s.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono text-destructive">
          ⊘ energy &lt; {energyThresholdJ} J
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Multi-series trajectory chart with energy threshold markers"
      >
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line
            key={t}
            x1={PAD.l}
            x2={PAD.l + innerW}
            y1={PAD.t + innerH * t}
            y2={PAD.t + innerH * t}
            stroke="hsl(var(--border))"
            strokeOpacity="0.4"
          />
        ))}

        {/* series paths */}
        {series.map(s => {
          if (!visible[s.key]) return null;
          const d = rows
            .map((r, i) =>
              `${i === 0 ? 'M' : 'L'} ${x(r.range).toFixed(1)} ${norm(s.values, s.values[i]).toFixed(1)}`,
            )
            .join(' ');
          return (
            <path
              key={s.key}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          );
        })}

        {/* energy threshold breach markers — rings on the energy series */}
        {visible.energy &&
          rows.map((r, i) => {
            if (r.energy >= energyThresholdJ) return null;
            return (
              <g key={`breach-${r.range}`}>
                <circle
                  cx={x(r.range)}
                  cy={norm(series[2].values, r.energy)}
                  r={5}
                  fill="none"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="1.5"
                />
                <line
                  x1={x(r.range)}
                  x2={x(r.range)}
                  y1={PAD.t}
                  y2={PAD.t + innerH}
                  stroke="hsl(var(--destructive))"
                  strokeOpacity="0.25"
                  strokeDasharray="3 3"
                />
              </g>
            );
          })}

        {/* x labels */}
        {rows.map(r => (
          <text
            key={r.range}
            x={x(r.range)}
            y={H - 6}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            {r.range}
          </text>
        ))}
      </svg>
      <div className="text-[10px] font-mono text-muted-foreground mt-1 text-center">
        range (m) — each series is normalised to its own max
      </div>
    </div>
  );
}

function ThresholdControl({
  label,
  unit,
  value,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-muted-foreground">
      <span className="uppercase tracking-wide text-[10px]">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="w-16 bg-muted/40 border border-border rounded px-1.5 py-0.5 text-right text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <span className="text-[10px]">{unit}</span>
    </label>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-block h-2.5 w-3 rounded-sm', swatch)} aria-hidden />
      <span>{label}</span>
    </span>
  );
}