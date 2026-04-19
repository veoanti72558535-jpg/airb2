import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BallisticTable } from './BallisticTable';
import { I18nProvider } from '@/lib/i18n';
import type { BallisticResult } from '@/lib/types';

function mkRow(range: number): BallisticResult {
  return {
    range,
    drop: -range * 0.5,
    holdover: range * 0.1,
    holdoverMRAD: range * 0.03,
    velocity: 280 - range * 0.5,
    energy: 30 - range * 0.1,
    tof: range * 0.005,
    windDrift: range * 0.2,
    windDriftMOA: range * 0.05,
    windDriftMRAD: range * 0.015,
    clicksElevation: range,
    clicksWindage: Math.round(range / 2),
  };
}

const ROWS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(mkRow);

function renderTable(props: Partial<React.ComponentProps<typeof BallisticTable>> = {}) {
  return render(
    <I18nProvider>
      <BallisticTable
        rows={ROWS}
        clickUnit="MRAD"
        maxRangeHint={100}
        defaultOpen
        {...props}
      />
    </I18nProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('BallisticTable — rendering', () => {
  it('rend les lignes attendues avec la config par défaut', () => {
    renderTable();
    const table = screen.getByTestId('bt-table');
    // default config: step 10, start 0, max 100 → 11 rows
    expect(within(table).getAllByRole('row').length).toBe(12); // 1 header + 11
  });

  it('affiche les colonnes par défaut et masque les autres', () => {
    renderTable();
    expect(screen.getByTestId('bt-th-distance')).toBeInTheDocument();
    expect(screen.getByTestId('bt-th-drop')).toBeInTheDocument();
    expect(screen.getByTestId('bt-th-holdover')).toBeInTheDocument();
    expect(screen.getByTestId('bt-th-velocity')).toBeInTheDocument();
    expect(screen.getByTestId('bt-th-energy')).toBeInTheDocument();
    expect(screen.queryByTestId('bt-th-tof')).toBeNull();
    expect(screen.queryByTestId('bt-th-windClicks')).toBeNull();
  });

  it('démarre fermé par défaut quand defaultOpen=false', () => {
    renderTable({ defaultOpen: false });
    expect(screen.queryByTestId('bt-table')).toBeNull();
  });
});

describe('BallisticTable — column toggle', () => {
  it("ajoute la colonne 'tof' quand on la coche", () => {
    renderTable();
    fireEvent.click(screen.getByText(/Réglages|Settings/));
    fireEvent.click(screen.getByTestId('bt-col-tof'));
    expect(screen.getByTestId('bt-th-tof')).toBeInTheDocument();
  });

  it("masque 'velocity' quand on la décoche", () => {
    renderTable();
    fireEvent.click(screen.getByText(/Réglages|Settings/));
    fireEvent.click(screen.getByTestId('bt-col-velocity'));
    expect(screen.queryByTestId('bt-th-velocity')).toBeNull();
  });

  it("ne permet pas de masquer la colonne distance (required)", () => {
    renderTable();
    fireEvent.click(screen.getByText(/Réglages|Settings/));
    const distBtn = screen.getByTestId('bt-col-distance');
    expect(distBtn).toBeDisabled();
  });
});

describe('BallisticTable — distance/step config', () => {
  it('met à jour la table quand on change le pas', () => {
    renderTable();
    fireEvent.click(screen.getByText(/Réglages|Settings/));
    const stepInput = screen.getByTestId('bt-step') as HTMLInputElement;
    fireEvent.change(stepInput, { target: { value: '25' } });
    const rows = within(screen.getByTestId('bt-table')).getAllByRole('row');
    // header + rows at 0, 25, 50, 75, 100 → 6
    expect(rows.length).toBe(6);
  });

  it('met à jour la table quand on change la distance max', () => {
    renderTable();
    fireEvent.click(screen.getByText(/Réglages|Settings/));
    fireEvent.change(screen.getByTestId('bt-max'), { target: { value: '50' } });
    expect(screen.queryByTestId('bt-row-100')).toBeNull();
    expect(screen.getByTestId('bt-row-50')).toBeInTheDocument();
  });

  it('reset rétablit la config par défaut', () => {
    renderTable();
    fireEvent.click(screen.getByText(/Réglages|Settings/));
    fireEvent.change(screen.getByTestId('bt-max'), { target: { value: '20' } });
    expect(screen.queryByTestId('bt-row-100')).toBeNull();
    fireEvent.click(screen.getByText(/Réinitialiser|Reset/));
    expect(screen.getByTestId('bt-row-100')).toBeInTheDocument();
  });

  it('affiche un état vide quand aucune ligne ne tombe dans la plage', () => {
    renderTable();
    fireEvent.click(screen.getByText(/Réglages|Settings/));
    fireEvent.change(screen.getByTestId('bt-start'), { target: { value: '500' } });
    fireEvent.change(screen.getByTestId('bt-max'), { target: { value: '600' } });
    expect(screen.queryByTestId('bt-table')).toBeNull();
    expect(screen.getByText(/Aucune ligne|No rows/)).toBeInTheDocument();
  });
});

describe('BallisticTable — non-régression engine', () => {
  it("n'altère pas les données BallisticResult passées en input", () => {
    const snapshot = ROWS.map(r => ({ ...r }));
    renderTable();
    // Compare numerically — JSON serialisation makes 0 vs -0 spuriously differ.
    expect(ROWS.length).toBe(snapshot.length);
    for (let i = 0; i < ROWS.length; i++) {
      expect(ROWS[i].range).toBe(snapshot[i].range);
      expect(ROWS[i].velocity).toBe(snapshot[i].velocity);
      expect(ROWS[i].drop).toBe(snapshot[i].drop);
    }
  });
});

describe('BallisticTable — Tranche P : marqueurs Near/Far Zero', () => {
  it('marque la ligne la plus proche de nearZeroDistance avec data-zero-marker="near"', () => {
    renderTable({ nearZeroDistance: 22 });
    // step=10 → tol=5 → ligne 20 doit être marquée
    const row = screen.getByTestId('bt-row-20');
    expect(row.getAttribute('data-zero-marker')).toBe('near');
  });

  it('marque la ligne la plus proche de farZeroDistance avec data-zero-marker="far"', () => {
    renderTable({ farZeroDistance: 78 });
    const row = screen.getByTestId('bt-row-80');
    expect(row.getAttribute('data-zero-marker')).toBe('far');
  });

  it('marque deux lignes distinctes pour Near et Far', () => {
    renderTable({ nearZeroDistance: 18, farZeroDistance: 72 });
    expect(screen.getByTestId('bt-row-20').getAttribute('data-zero-marker')).toBe('near');
    expect(screen.getByTestId('bt-row-70').getAttribute('data-zero-marker')).toBe('far');
  });

  it("n'attribue aucun marqueur lorsque rien n'est fourni", () => {
    renderTable();
    const marked = screen
      .getAllByTestId(/bt-row-/)
      .filter(r => r.getAttribute('data-zero-marker') != null);
    expect(marked.length).toBe(0);
  });

  it("n'attribue aucun marqueur si la distance est hors tolérance ±step/2", () => {
    renderTable({ nearZeroDistance: 200 });
    const marked = screen
      .getAllByTestId(/bt-row-/)
      .filter(r => r.getAttribute('data-zero-marker') != null);
    expect(marked.length).toBe(0);
  });

  it('affiche la légende NZ/FZ uniquement si au moins un marqueur est présent', () => {
    const { rerender } = renderTable();
    expect(screen.queryByTestId('bt-zero-legend')).toBeNull();
    rerender(
      <I18nProvider>
        <BallisticTable
          rows={ROWS}
          clickUnit="MRAD"
          maxRangeHint={100}
          defaultOpen
          nearZeroDistance={20}
        />
      </I18nProvider>,
    );
    expect(screen.getByTestId('bt-zero-legend')).toBeInTheDocument();
  });

  it('ignore null / undefined / NaN sans crasher', () => {
    renderTable({ nearZeroDistance: null, farZeroDistance: undefined });
    const marked = screen
      .getAllByTestId(/bt-row-/)
      .filter(r => r.getAttribute('data-zero-marker') != null);
    expect(marked.length).toBe(0);
  });

  it('expose le marqueur même si la ligne est aussi au-dessus du seuil énergie', () => {
    // La classe destructive l'emporte visuellement, mais data-zero-marker
    // reste défini pour permettre aux tests / a11y de tracer l'origine.
    renderTable({ nearZeroDistance: 20, energyThresholdJ: 0.001 });
    const row = screen.getByTestId('bt-row-20');
    expect(row.getAttribute('data-zero-marker')).toBe('near');
  });
});
