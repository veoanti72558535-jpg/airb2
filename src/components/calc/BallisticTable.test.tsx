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
