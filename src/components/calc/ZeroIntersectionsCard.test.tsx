import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { ZeroIntersectionsCard } from './ZeroIntersectionsCard';
import type { ZeroIntersections } from '@/lib/zero-intersections';

/**
 * Tranche O — tests UI du bloc Near/Far Zero.
 * Pas de moteur, pas de calcul réel : on alimente directement le helper.
 */

function wrap(node: React.ReactNode) {
  return (
    <MemoryRouter>
      <ThemeProvider>
        <I18nProvider>{node}</I18nProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('ZeroIntersectionsCard', () => {
  it('affiche near + far quand disponibles', () => {
    const data: ZeroIntersections = {
      nearZeroDistance: 12.5,
      farZeroDistance: 35,
      nearExactSample: false,
      farExactSample: false,
      nearMissingReason: null,
      farMissingReason: null,
    };
    render(wrap(<ZeroIntersectionsCard data={data} />));
    const card = screen.getByTestId('zero-intersections');
    expect(card).toBeInTheDocument();
    expect(screen.getByText(/near zero/i)).toBeInTheDocument();
    expect(screen.getByText(/far zero/i)).toBeInTheDocument();
    // Numeric values are present
    expect(card.textContent).toMatch(/12\.5/);
    expect(card.textContent).toMatch(/35\.0/);
  });

  it('affiche un état "hors plage" quand far est manquant', () => {
    const data: ZeroIntersections = {
      nearZeroDistance: 18,
      farZeroDistance: null,
      nearExactSample: false,
      farExactSample: false,
      nearMissingReason: null,
      farMissingReason: 'out-of-range',
    };
    render(wrap(<ZeroIntersectionsCard data={data} />));
    expect(screen.getByText(/hors plage calculée/i)).toBeInTheDocument();
  });

  it('affiche un état "non déterminable" pour insufficient data', () => {
    const data: ZeroIntersections = {
      nearZeroDistance: null,
      farZeroDistance: null,
      nearExactSample: false,
      farExactSample: false,
      nearMissingReason: 'insufficient',
      farMissingReason: 'insufficient',
    };
    render(wrap(<ZeroIntersectionsCard data={data} />));
    const messages = screen.getAllByText(/non déterminable/i);
    expect(messages.length).toBe(2);
  });

  it('marque visuellement les croisements exacts', () => {
    const data: ZeroIntersections = {
      nearZeroDistance: 15,
      farZeroDistance: 45,
      nearExactSample: true,
      farExactSample: true,
      nearMissingReason: null,
      farMissingReason: null,
    };
    render(wrap(<ZeroIntersectionsCard data={data} />));
    const card = screen.getByTestId('zero-intersections');
    // Two exact-sample markers (one per slot)
    const dots = card.querySelectorAll('[title]');
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it('ne crash pas avec un far présent et un near absent (cas limite)', () => {
    const data: ZeroIntersections = {
      nearZeroDistance: null,
      farZeroDistance: 30,
      nearExactSample: false,
      farExactSample: false,
      nearMissingReason: 'out-of-range',
      farMissingReason: null,
    };
    render(wrap(<ZeroIntersectionsCard data={data} />));
    expect(screen.getByText(/30\.0/)).toBeInTheDocument();
    expect(screen.getByText(/hors plage calculée/i)).toBeInTheDocument();
  });
});
