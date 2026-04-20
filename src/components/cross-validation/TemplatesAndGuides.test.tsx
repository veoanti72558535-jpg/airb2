/**
 * Tests UI — `TemplatesAndGuides`.
 * Vérifie :
 *  - rendu des 4 templates
 *  - callback "use template" reçoit bien un cas valide
 *  - guides ChairGun / Strelok / MERO listés et expansibles
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { TemplatesAndGuides } from './TemplatesAndGuides';
import { validateUserCase } from '@/lib/cross-validation';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('TemplatesAndGuides', () => {
  it('renders the collapsible card collapsed by default', () => {
    renderWithI18n(<TemplatesAndGuides />);
    expect(screen.getByTestId('cv-templates-card')).toBeInTheDocument();
    // List initially not visible (collapsed) — but the trigger is visible.
    expect(screen.getByTestId('cv-templates-toggle')).toBeInTheDocument();
  });

  it('reveals the 4 templates and the 3 source guides when expanded', () => {
    renderWithI18n(<TemplatesAndGuides />);
    fireEvent.click(screen.getByTestId('cv-templates-toggle'));
    // Templates
    expect(screen.getByTestId('cv-template-chairgun-elite')).toBeInTheDocument();
    expect(screen.getByTestId('cv-template-strelok-pro')).toBeInTheDocument();
    expect(screen.getByTestId('cv-template-mero')).toBeInTheDocument();
    expect(screen.getByTestId('cv-template-generic')).toBeInTheDocument();
    // Guides
    expect(screen.getByTestId('cv-guide-chairgun-elite')).toBeInTheDocument();
    expect(screen.getByTestId('cv-guide-strelok-pro')).toBeInTheDocument();
    expect(screen.getByTestId('cv-guide-mero')).toBeInTheDocument();
  });

  it('shows the "Use" button only when onUseTemplate is provided', () => {
    renderWithI18n(<TemplatesAndGuides />);
    fireEvent.click(screen.getByTestId('cv-templates-toggle'));
    expect(screen.queryByTestId('cv-template-chairgun-elite-use')).toBeNull();
    expect(screen.getByTestId('cv-template-chairgun-elite-download')).toBeInTheDocument();

    cleanup();
    renderWithI18n(<TemplatesAndGuides onUseTemplate={() => {}} />);
    fireEvent.click(screen.getByTestId('cv-templates-toggle'));
    expect(screen.getByTestId('cv-template-chairgun-elite-use')).toBeInTheDocument();
  });

  it('passes a schema-valid case to onUseTemplate', () => {
    const onUse = vi.fn();
    renderWithI18n(<TemplatesAndGuides onUseTemplate={onUse} />);
    fireEvent.click(screen.getByTestId('cv-templates-toggle'));
    fireEvent.click(screen.getByTestId('cv-template-strelok-pro-use'));
    expect(onUse).toHaveBeenCalledTimes(1);
    const arg = onUse.mock.calls[0][0];
    expect(validateUserCase(arg).ok).toBe(true);
    // The reference target source should be Strelok Pro.
    expect(arg.references[0].meta.source).toBe('strelok-pro');
  });

  it('expands a guide and shows its bulleted sections', () => {
    renderWithI18n(<TemplatesAndGuides />);
    fireEvent.click(screen.getByTestId('cv-templates-toggle'));
    const guide = screen.getByTestId('cv-guide-chairgun-elite');
    // Open the guide
    fireEvent.click(guide.querySelector('button')!);
    // Sections render their headings (FR/EN — match either)
    expect(
      screen.getAllByText(/Inputs to capture|Inputs à relever/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Limits & pitfalls|Limites & pièges/i).length,
    ).toBeGreaterThan(0);
  });

  it('triggers a download (createObjectURL + click) on Download', () => {
    const createFn = vi.fn(() => 'blob:mock');
    const revokeFn = vi.fn();
    // jsdom does not implement these — define them before spying.
    Object.defineProperty(URL, 'createObjectURL', { value: createFn, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeFn, configurable: true });
    renderWithI18n(<TemplatesAndGuides />);
    fireEvent.click(screen.getByTestId('cv-templates-toggle'));
    fireEvent.click(screen.getByTestId('cv-template-mero-download'));
    expect(createFn).toHaveBeenCalled();
    expect(revokeFn).toHaveBeenCalled();
  });
});