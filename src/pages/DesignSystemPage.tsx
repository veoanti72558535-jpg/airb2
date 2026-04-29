import { useState } from 'react';
import { Crosshair, Gauge, Wind, Sparkles, Layers } from 'lucide-react';
import { Section } from '@/components/calc/Section';
import { ResultsCard } from '@/components/calc/ResultsCard';
import { Field } from '@/components/calc/Field';
import { Switch } from '@/components/ui/switch';
import { BallisticResult, WeatherSnapshot } from '@/lib/types';

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
    windDirection: 90,
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
      </article>

      <footer className="pt-6 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
        Source-of-truth components live under{' '}
        <code className="text-primary">src/components/calc/</code>. Sync this
        page with Claude Design after any visual change to either component.
      </footer>
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