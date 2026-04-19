import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { Bullets4ProjectileDetails } from './Bullets4ProjectileDetails';
import type { Projectile } from '@/lib/types';

const baseProjectile: Projectile = {
  id: 'p1',
  brand: 'Berger',
  model: 'FB Varmint',
  weight: 25,
  bc: 0.152,
  caliber: '.17',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('Bullets4ProjectileDetails', () => {
  it('returns null when no enriched field is present', () => {
    const { container } = renderWithI18n(
      <Bullets4ProjectileDetails projectile={baseProjectile} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the catalog section when at least one enriched field is present', () => {
    renderWithI18n(
      <Bullets4ProjectileDetails
        projectile={{
          ...baseProjectile,
          diameterMm: 4.3688,
          diameterIn: 0.172,
          weightGrains: 25,
          weightGrams: 1.6199,
          bcG1: 0.152,
        }}
      />,
    );
    expect(screen.getByText(/Données catalogue avancées/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.3688 mm/)).toBeInTheDocument();
    expect(screen.getByText(/0\.172 in/)).toBeInTheDocument();
    expect(screen.getByText(/25 gr/)).toBeInTheDocument();
    expect(screen.getByText(/1\.62 g/)).toBeInTheDocument();
  });

  it('does not render rows for absent fields (no empty lines)', () => {
    renderWithI18n(
      <Bullets4ProjectileDetails
        projectile={{ ...baseProjectile, diameterMm: 5.5 }}
      />,
    );
    expect(screen.queryByText(/BC G1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/BC G7/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Longueur \(mm\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Provenance/)).not.toBeInTheDocument();
  });

  it('renders the bcZones table when zones are provided', () => {
    renderWithI18n(
      <Bullets4ProjectileDetails
        projectile={{
          ...baseProjectile,
          bcZones: [
            { bc: 0.25, minVelocity: 250 },
            { bc: 0.22, minVelocity: 180 },
          ],
        }}
      />,
    );
    expect(screen.getByText(/Zones BC/i)).toBeInTheDocument();
    expect(screen.getByText('0.25')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('0.22')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
  });

  it('hides bcZones table when bcZones is null or empty', () => {
    renderWithI18n(
      <Bullets4ProjectileDetails
        projectile={{ ...baseProjectile, bcZones: null, diameterMm: 5.5 }}
      />,
    );
    expect(screen.queryByText(/Zones BC/i)).not.toBeInTheDocument();

    const { container } = renderWithI18n(
      <Bullets4ProjectileDetails
        projectile={{ ...baseProjectile, bcZones: [] }}
      />,
    );
    // bcZones empty + no other enriched field → null
    expect(container.firstChild).toBeNull();
  });

  it('renders the provenance section when source fields are present', () => {
    renderWithI18n(
      <Bullets4ProjectileDetails
        projectile={{
          ...baseProjectile,
          sourceDbId: '42',
          sourceTable: 'bullets',
          importedFrom: 'json-user',
        }}
      />,
    );
    expect(screen.getByText(/Provenance/)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('bullets')).toBeInTheDocument();
    expect(screen.getByText('json-user')).toBeInTheDocument();
  });

  it('renders provenance alone (no catalog section) when only source fields are present', () => {
    renderWithI18n(
      <Bullets4ProjectileDetails
        projectile={{ ...baseProjectile, sourceDbId: '99' }}
      />,
    );
    expect(screen.queryByText(/Données catalogue avancées/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Provenance/)).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });
});
