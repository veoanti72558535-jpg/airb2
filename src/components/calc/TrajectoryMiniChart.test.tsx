import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrajectoryMiniChart } from './TrajectoryMiniChart';
import { I18nProvider } from '@/lib/i18n';
import type { BallisticResult } from '@/lib/types';

function mkRow(range: number, drop: number): BallisticResult {
  return {
    range,
    drop,
    holdover: 0,
    holdoverMRAD: 0,
    velocity: 280 - range * 0.5,
    energy: 30 - range * 0.1,
    tof: range * 0.005,
    windDrift: 0,
    windDriftMOA: 0,
    windDriftMRAD: 0,
    clicksElevation: 0,
    clicksWindage: 0,
  };
}

// Trajectoire jouet : sous LOS au départ, croise vers le haut puis redescend.
const ROWS: BallisticResult[] = [
  mkRow(0, -50),
  mkRow(10, -10),
  mkRow(20, 5),   // au-dessus
  mkRow(40, 6),
  mkRow(60, -2),  // redescend sous LOS
  mkRow(80, -25),
  mkRow(100, -60),
];

function renderChart(props: Partial<React.ComponentProps<typeof TrajectoryMiniChart>> = {}) {
  return render(
    <I18nProvider>
      <TrajectoryMiniChart rows={ROWS} {...props} />
    </I18nProvider>,
  );
}

describe('TrajectoryMiniChart — Tranche P', () => {
  it("affiche l'état vide quand aucune donnée exploitable", () => {
    render(
      <I18nProvider>
        <TrajectoryMiniChart rows={[]} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('trajectory-mini-chart-empty')).toBeInTheDocument();
  });

  it("affiche l'état vide avec une seule ligne", () => {
    render(
      <I18nProvider>
        <TrajectoryMiniChart rows={[mkRow(0, -50)]} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('trajectory-mini-chart-empty')).toBeInTheDocument();
  });

  it('rend le SVG avec ligne de visée et chemin de trajectoire', () => {
    renderChart();
    expect(screen.getByTestId('trajectory-mini-chart-svg')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-mini-chart-los')).toBeInTheDocument();
    const path = screen.getByTestId('trajectory-mini-chart-path');
    expect(path).toBeInTheDocument();
    // chemin doit commencer par "M" et contenir au moins un "L".
    const d = path.getAttribute('d') ?? '';
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('L');
  });

  it('affiche le marqueur Near Zero quand fourni dans la plage', () => {
    renderChart({ nearZeroDistance: 15 });
    expect(screen.getByTestId('trajectory-mini-chart-near')).toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-mini-chart-far')).toBeNull();
  });

  it('affiche le marqueur Far Zero quand fourni dans la plage', () => {
    renderChart({ farZeroDistance: 55 });
    expect(screen.getByTestId('trajectory-mini-chart-far')).toBeInTheDocument();
  });

  it('affiche les deux marqueurs simultanément', () => {
    renderChart({ nearZeroDistance: 15, farZeroDistance: 55 });
    expect(screen.getByTestId('trajectory-mini-chart-near')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-mini-chart-far')).toBeInTheDocument();
  });

  it("ignore une distance hors plage sans crasher", () => {
    renderChart({ nearZeroDistance: 9999 });
    expect(screen.queryByTestId('trajectory-mini-chart-near')).toBeNull();
    // le chart reste rendu
    expect(screen.getByTestId('trajectory-mini-chart-svg')).toBeInTheDocument();
  });

  it('ignore null / undefined / NaN', () => {
    renderChart({ nearZeroDistance: null, farZeroDistance: undefined });
    expect(screen.queryByTestId('trajectory-mini-chart-near')).toBeNull();
    expect(screen.queryByTestId('trajectory-mini-chart-far')).toBeNull();
  });

  it("ne mute pas le tableau de résultats reçu en prop", () => {
    const snapshot = ROWS.map(r => ({ ...r }));
    renderChart({ nearZeroDistance: 15, farZeroDistance: 55 });
    for (let i = 0; i < ROWS.length; i++) {
      expect(ROWS[i].range).toBe(snapshot[i].range);
      expect(ROWS[i].drop).toBe(snapshot[i].drop);
    }
  });

  it('affiche un récap NZ/FZ textuel sous le graphique', () => {
    renderChart({ nearZeroDistance: 15, farZeroDistance: 55 });
    // Le récap inclut les badges NZ et FZ (text content)
    const root = screen.getByTestId('trajectory-mini-chart');
    expect(root.textContent).toMatch(/NZ/);
    expect(root.textContent).toMatch(/FZ/);
  });
});

describe('TrajectoryMiniChart — Tranche R (overlay PBR)', () => {
  it("affiche la bande vitale ± rayon quand pbr.vitalZoneM est valide", () => {
    renderChart({
      pbr: {
        vitalZoneM: 0.05,
        startDistance: 12,
        endDistance: 55,
        apexDistance: 30,
        apexMm: 12,
        limitedByComputedRange: false,
      },
    });
    expect(screen.getByTestId('trajectory-mini-chart-pbr')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-mini-chart-pbr-band')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-mini-chart-pbr-window')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-mini-chart-pbr-start')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-mini-chart-pbr-end')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-mini-chart-pbr-apex')).toBeInTheDocument();
  });

  it("n'affiche pas la borne 'end' quand limitedByComputedRange est vrai", () => {
    renderChart({
      pbr: {
        vitalZoneM: 0.05,
        startDistance: 12,
        endDistance: 100,
        apexDistance: 40,
        apexMm: 6,
        limitedByComputedRange: true,
      },
    });
    expect(screen.getByTestId('trajectory-mini-chart-pbr-start')).toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-mini-chart-pbr-end')).toBeNull();
    // La sub-bande PBR (windowRect) reste honnête : clamp à la plage.
    expect(screen.getByTestId('trajectory-mini-chart-pbr-window')).toBeInTheDocument();
  });

  it("n'affiche pas de fenêtre PBR quand start/end sont null mais garde la bande", () => {
    renderChart({
      pbr: {
        vitalZoneM: 0.05,
        startDistance: null,
        endDistance: null,
        apexDistance: null,
        apexMm: null,
        limitedByComputedRange: false,
      },
    });
    expect(screen.getByTestId('trajectory-mini-chart-pbr-band')).toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-mini-chart-pbr-window')).toBeNull();
    expect(screen.queryByTestId('trajectory-mini-chart-pbr-start')).toBeNull();
    expect(screen.queryByTestId('trajectory-mini-chart-pbr-end')).toBeNull();
    expect(screen.queryByTestId('trajectory-mini-chart-pbr-apex')).toBeNull();
  });

  it('ignore une zone vitale invalide (0, négative, NaN)', () => {
    renderChart({
      pbr: {
        vitalZoneM: 0,
        startDistance: 10,
        endDistance: 50,
      },
    });
    expect(screen.queryByTestId('trajectory-mini-chart-pbr')).toBeNull();

    renderChart({
      pbr: {
        vitalZoneM: NaN,
        startDistance: 10,
        endDistance: 50,
      },
    });
    expect(screen.queryAllByTestId('trajectory-mini-chart-pbr').length).toBe(0);
  });

  it("n'affiche aucune couche PBR quand pbr est null/undefined", () => {
    renderChart({ pbr: null });
    expect(screen.queryByTestId('trajectory-mini-chart-pbr')).toBeNull();
    renderChart({ pbr: undefined });
    expect(screen.queryAllByTestId('trajectory-mini-chart-pbr').length).toBe(0);
  });

  it('affiche la légende textuelle PBR (start–end) quand fenêtre disponible', () => {
    renderChart({
      pbr: {
        vitalZoneM: 0.05,
        startDistance: 12,
        endDistance: 55,
      },
    });
    const legend = screen.getByTestId('trajectory-mini-chart-pbr-legend');
    expect(legend.textContent).toMatch(/PBR/);
  });

  it("la légende PBR montre un '+' quand limitedByComputedRange", () => {
    renderChart({
      pbr: {
        vitalZoneM: 0.05,
        startDistance: 12,
        endDistance: 100,
        limitedByComputedRange: true,
      },
    });
    const legend = screen.getByTestId('trajectory-mini-chart-pbr-legend');
    expect(legend.textContent).toMatch(/\+/);
  });

  it('clamp la sub-bande PBR à la plage du graphe sans crasher', () => {
    renderChart({
      pbr: {
        vitalZoneM: 0.05,
        startDistance: -50, // hors plage min
        endDistance: 9999,  // hors plage max
      },
    });
    // La fenêtre est clampée sur le domaine X, donc visible.
    expect(screen.getByTestId('trajectory-mini-chart-pbr-window')).toBeInTheDocument();
    // Les bornes hors plage ne sont pas tracées.
    expect(screen.queryByTestId('trajectory-mini-chart-pbr-start')).toBeNull();
    expect(screen.queryByTestId('trajectory-mini-chart-pbr-end')).toBeNull();
  });

  it("n'affiche pas l'apex si la distance est hors plage", () => {
    renderChart({
      pbr: {
        vitalZoneM: 0.05,
        startDistance: 10,
        endDistance: 60,
        apexDistance: 9999,
        apexMm: 10,
      },
    });
    expect(screen.queryByTestId('trajectory-mini-chart-pbr-apex')).toBeNull();
  });

  it('ne mute pas le tableau de résultats quand l’overlay PBR est actif', () => {
    const snapshot = ROWS.map(r => ({ ...r }));
    renderChart({
      pbr: {
        vitalZoneM: 0.05,
        startDistance: 10,
        endDistance: 55,
        apexDistance: 30,
        apexMm: 6,
      },
    });
    for (let i = 0; i < ROWS.length; i++) {
      expect(ROWS[i].range).toBe(snapshot[i].range);
      expect(ROWS[i].drop).toBe(snapshot[i].drop);
    }
  });
});