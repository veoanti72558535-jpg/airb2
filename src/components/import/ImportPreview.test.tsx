/**
 * Tranche F.3 — Tests `ImportPreview`.
 * Vérifie l'ordre obligatoire des sections (rejected → sanitized →
 * duplicate → ok), les compteurs et l'affichage des notes de
 * sanitisation. Aucun test de pipeline (couvert par F.2).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ImportPreview } from './ImportPreview';
import type { ProjectileImportPreview } from '@/lib/import-pipeline';

function makePreview(): ProjectileImportPreview {
  return {
    entityType: 'projectile',
    source: 'json-user',
    total: 4,
    okCount: 1,
    sanitizedCount: 1,
    duplicateCount: 1,
    rejectedCount: 1,
    items: [
      {
        index: 0,
        status: 'rejected',
        issues: [{ path: ['weight'], message: 'Required' }],
      },
      {
        index: 1,
        status: 'sanitized',
        data: {
          brand: 'X', model: 'S', weight: 18, bc: 0.025, caliber: '.22',
          bcModel: 'G1', importedFrom: 'json-user',
        },
        notes: [{
          code: 'drag-law-replaced',
          message: 'Drag law « SLG1 » non publique : remplacée par « G1 ».',
        }],
      },
      {
        index: 2,
        status: 'duplicate',
        data: {
          brand: 'JSB', model: 'Hades', weight: 15.89, bc: 0.021, caliber: '.22',
          importedFrom: 'json-user',
        },
        duplicateKey: 'jsb|hades|15.89|.22',
      },
      {
        index: 3,
        status: 'ok',
        data: {
          brand: 'H&N', model: 'Baracuda', weight: 21, bc: 0.030, caliber: '.22',
          importedFrom: 'json-user',
        },
      },
    ],
  };
}

describe('ImportPreview', () => {
  it('renders all four sections in the mandatory order', () => {
    render(
      <I18nProvider>
        <ImportPreview preview={makePreview()} />
      </I18nProvider>,
    );
    const sections = [
      screen.getByTestId('section-rejected'),
      screen.getByTestId('section-sanitized'),
      screen.getByTestId('section-duplicates'),
      screen.getByTestId('section-ok'),
    ];
    // Vérifie l'ordre DOM : chaque section doit précéder la suivante.
    for (let i = 0; i < sections.length - 1; i += 1) {
      const cmp = sections[i].compareDocumentPosition(sections[i + 1]);
      // 4 = DOCUMENT_POSITION_FOLLOWING
      // eslint-disable-next-line no-bitwise
      expect(cmp & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('renders the five counters', () => {
    render(
      <I18nProvider>
        <ImportPreview preview={makePreview()} />
      </I18nProvider>,
    );
    // total = 4, rejected = 1, sanitized = 1, duplicates = 1, ok = 1
    const cells = screen.getAllByText(/^[0-9]+$/);
    const values = cells.map(c => c.textContent);
    expect(values).toEqual(expect.arrayContaining(['4', '1']));
  });

  it('renders the sanitisation note for sanitized items', () => {
    render(
      <I18nProvider>
        <ImportPreview preview={makePreview()} />
      </I18nProvider>,
    );
    expect(
      screen.getByText(/Drag law .* SLG1 .* non publique/i),
    ).toBeTruthy();
  });

  it('renders fatalError when present and skips sections', () => {
    render(
      <I18nProvider>
        <ImportPreview
          preview={{
            entityType: 'projectile',
            source: 'json-user',
            total: 0,
            okCount: 0,
            sanitizedCount: 0,
            duplicateCount: 0,
            rejectedCount: 0,
            items: [],
            fatalError: { code: 'payload-too-large', message: '> 1MB' },
          }}
        />
      </I18nProvider>,
    );
    expect(screen.getByTestId('import-preview-fatal')).toBeTruthy();
    expect(screen.queryByTestId('section-rejected')).toBeNull();
  });

  it('hides empty sections', () => {
    render(
      <I18nProvider>
        <ImportPreview
          preview={{
            entityType: 'reticle',
            source: 'json-user',
            total: 1,
            okCount: 1,
            sanitizedCount: 0,
            duplicateCount: 0,
            rejectedCount: 0,
            items: [{
              index: 0,
              status: 'ok',
              data: {
                brand: 'B', model: 'M', type: 'mil-dot', unit: 'MRAD',
                subtension: 1, importedFrom: 'json-user',
              },
            }],
          }}
        />
      </I18nProvider>,
    );
    expect(screen.queryByTestId('section-rejected')).toBeNull();
    expect(screen.queryByTestId('section-sanitized')).toBeNull();
    expect(screen.queryByTestId('section-duplicates')).toBeNull();
    expect(screen.getByTestId('section-ok')).toBeTruthy();
  });
});
