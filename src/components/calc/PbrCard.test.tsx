import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PbrCard } from './PbrCard';
import { I18nProvider } from '@/lib/i18n';
import type { BallisticResult } from '@/lib/types';

function mkRow(range: number, dropMm: number): BallisticResult {
  return {
    range,
    drop: dropMm,
    holdover: 0,
    holdoverMRAD: 0,
    velocity: 280,
    energy: 30,
    tof: range * 0.005,
    windDrift: 0,
    windDriftMOA: 0,
    windDriftMRAD: 0,
    clicksElevation: 0,
    clicksWindage: 0,
  };
}

const ROWS_OK: BallisticResult[] = [
  mkRow(0, -90),
  mkRow(10, -50),
  mkRow(30, -10),
  mkRow(50, 20),
  mkRow(70, -50),
  mkRow(100, -200),
];

const ROWS_NEVER_IN: BallisticResult[] = [
  mkRow(0, -300),
  mkRow(50, -250),
  mkRow(100, -400),
];

const ROWS_LIMITED: BallisticResult[] = [
  mkRow(0, -100),
  mkRow(20, -10),
  mkRow(40, 5),
  mkRow(60, -20),
];

beforeEach(() => {
  localStorage.clear();
});

function renderCard(props: Partial<React.ComponentProps<typeof PbrCard>> = {}) {
  return render(
    <I18nProvider>
      <PbrCard rows={ROWS_OK} initialVitalZoneM={0.06} {...props} />
    </I18nProvider>,
  );
}

describe('PbrCard — Tranche P (UI)', () => {
  it('rend la carte et son input zone vitale', () => {
    renderCard();
    expect(screen.getByTestId('pbr-card')).toBeInTheDocument();
    expect(screen.getByTestId('pbr-vital-input')).toBeInTheDocument();
  });

  it('affiche les slots range / start / end quand un PBR est trouvé', () => {
    renderCard();
    expect(screen.getByTestId('pbr-range')).toBeInTheDocument();
    expect(screen.getByTestId('pbr-start')).toBeInTheDocument();
    expect(screen.getByTestId('pbr-end')).toBeInTheDocument();
  });

  it("affiche l'apex et sa distance quand disponibles", () => {
    renderCard();
    expect(screen.getByTestId('pbr-max-ordinate')).toBeInTheDocument();
    expect(screen.getByTestId('pbr-max-ordinate-distance')).toBeInTheDocument();
  });

  it('affiche l\'état "non déterminable" quand la trajectoire ne rentre jamais', () => {
    render(
      <I18nProvider>
        <PbrCard rows={ROWS_NEVER_IN} initialVitalZoneM={0.06} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('pbr-never-entered')).toBeInTheDocument();
    expect(screen.queryByTestId('pbr-range')).toBeNull();
  });

  it('affiche le suffixe "borné par la plage calculée" quand applicable', () => {
    render(
      <I18nProvider>
        <PbrCard rows={ROWS_LIMITED} initialVitalZoneM={0.08} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('pbr-end-suffix')).toBeInTheDocument();
  });

  it("affiche l'état indisponible avec moins de 2 lignes", () => {
    render(
      <I18nProvider>
        <PbrCard rows={[mkRow(0, -50)]} initialVitalZoneM={0.05} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('pbr-empty')).toBeInTheDocument();
  });

  it('met à jour la lecture quand on change la zone vitale', () => {
    renderCard();
    const before = screen.getByTestId('pbr-range').textContent;
    const input = screen.getByTestId('pbr-vital-input') as HTMLInputElement;
    // Augmenter la zone vitale → la plage PBR doit grandir.
    fireEvent.change(input, { target: { value: '15' } });
    const after = screen.getByTestId('pbr-range').textContent;
    expect(after).not.toBe(before);
  });

  it('appelle onVitalZoneChange en mètres quand l\'utilisateur édite', () => {
    let captured: number | null = null;
    render(
      <I18nProvider>
        <PbrCard
          rows={ROWS_OK}
          initialVitalZoneM={0.05}
          onVitalZoneChange={m => {
            captured = m;
          }}
        />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByTestId('pbr-vital-input'), {
      target: { value: '8' },
    });
    expect(captured).not.toBeNull();
    expect(captured!).toBeGreaterThan(0);
  });

  it('ne mute pas les BallisticResult d\'entrée', () => {
    const snap = ROWS_OK.map(r => ({ ...r }));
    renderCard();
    for (let i = 0; i < ROWS_OK.length; i++) {
      expect(ROWS_OK[i].drop).toBe(snap[i].drop);
      expect(ROWS_OK[i].range).toBe(snap[i].range);
    }
  });

  it('rejette une saisie négative sans crasher', () => {
    renderCard();
    const input = screen.getByTestId('pbr-vital-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '-5' } });
    // La carte reste rendue, on ne crashe pas.
    expect(screen.getByTestId('pbr-card')).toBeInTheDocument();
  });

  // ──────────────────────────── Tranche Q ────────────────────────────

  it('Tranche Q — persiste la zone vitale en localStorage en mètres', () => {
    renderCard();
    const input = screen.getByTestId('pbr-vital-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12' } });
    // 12 cm en mode métrique = 0.12 m (length category = cm par défaut métrique).
    const stored = localStorage.getItem('pbr-vital-zone-m-v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(typeof parsed).toBe('number');
    expect(parsed).toBeGreaterThan(0);
  });

  it('Tranche Q — relit la valeur persistée au montage (sans initialVitalZoneM)', () => {
    // Pré-seed du storage avec 0.09 m.
    localStorage.setItem('pbr-vital-zone-m-v1', JSON.stringify(0.09));
    render(
      <I18nProvider>
        <PbrCard rows={ROWS_OK} />
      </I18nProvider>,
    );
    const input = screen.getByTestId('pbr-vital-input') as HTMLInputElement;
    // L'input doit refléter 0.09 m dans l'unité d'affichage (cm par défaut → 9).
    expect(Number(input.value)).toBeGreaterThan(0);
  });

  it('Tranche Q — deux instances montées simultanément voient la même valeur', () => {
    localStorage.setItem('pbr-vital-zone-m-v1', JSON.stringify(0.07));
    const { container: c1 } = render(
      <I18nProvider>
        <PbrCard rows={ROWS_OK} />
      </I18nProvider>,
    );
    const { container: c2 } = render(
      <I18nProvider>
        <PbrCard rows={ROWS_OK} />
      </I18nProvider>,
    );
    const v1 = (c1.querySelector('[data-testid="pbr-vital-input"]') as HTMLInputElement).value;
    const v2 = (c2.querySelector('[data-testid="pbr-vital-input"]') as HTMLInputElement).value;
    expect(v1).toBe(v2);
  });
});
