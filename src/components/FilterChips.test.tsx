import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterChips, FilterChipOption } from '@/components/FilterChips';
import { I18nProvider } from '@/lib/i18n';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

const baseOptions: FilterChipOption[] = [
  { value: 'FX', count: 2 },
  { value: 'Daystate', count: 1 },
  { value: 'AirArms', count: 0 },
];

describe('FilterChips', () => {
  it('renders the "All" chip with the total count and label', () => {
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value={null}
        onChange={() => {}}
        options={baseOptions}
        totalCount={3}
      />,
    );
    expect(screen.getByText('MARQUE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tous \(3\)/ })).toBeInTheDocument();
  });

  it('renders one chip per option with its count badge', () => {
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value={null}
        onChange={() => {}}
        options={baseOptions}
        totalCount={3}
      />,
    );
    expect(screen.getByRole('button', { name: 'FX (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daystate (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AirArms (0)' })).toBeInTheDocument();
  });

  it('marks the active chip and the All chip as inactive when value matches an option', () => {
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value="FX"
        onChange={() => {}}
        options={baseOptions}
        totalCount={3}
      />,
    );
    const all = screen.getByRole('button', { name: /Tous \(3\)/ });
    const fx = screen.getByRole('button', { name: 'FX (2)' });
    // Active chip uses the primary border token
    expect(fx.className).toMatch(/border-primary/);
    expect(all.className).not.toMatch(/border-primary/);
  });

  it('matches active chip case-insensitively', () => {
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value="fx"
        onChange={() => {}}
        options={baseOptions}
        totalCount={3}
      />,
    );
    expect(screen.getByRole('button', { name: 'FX (2)' }).className).toMatch(/border-primary/);
  });

  it('disables chips with count=0 by default', () => {
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value={null}
        onChange={() => {}}
        options={baseOptions}
        totalCount={3}
      />,
    );
    expect(screen.getByRole('button', { name: 'AirArms (0)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'FX (2)' })).not.toBeDisabled();
  });

  it('keeps zero-count chips enabled when disableWhenZero is false', () => {
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value={null}
        onChange={() => {}}
        options={[{ value: 'AirArms', count: 0, disableWhenZero: false }]}
        totalCount={0}
      />,
    );
    expect(screen.getByRole('button', { name: 'AirArms (0)' })).not.toBeDisabled();
  });

  it('calls onChange(value) when a chip is clicked, and onChange(null) when active chip is clicked again', () => {
    const onChange = vi.fn();
    const { rerender } = renderWithI18n(
      <FilterChips
        label="MARQUE"
        value={null}
        onChange={onChange}
        options={baseOptions}
        totalCount={3}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'FX (2)' }));
    expect(onChange).toHaveBeenLastCalledWith('FX');

    rerender(
      <I18nProvider>
        <FilterChips
          label="MARQUE"
          value="FX"
          onChange={onChange}
          options={baseOptions}
          totalCount={3}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'FX (2)' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('calls onChange(null) when the All chip is clicked', () => {
    const onChange = vi.fn();
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value="FX"
        onChange={onChange}
        options={baseOptions}
        totalCount={3}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Tous \(3\)/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('hides the reset button when onReset is missing', () => {
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value={null}
        onChange={() => {}}
        options={baseOptions}
        totalCount={3}
      />,
    );
    expect(screen.queryByRole('button', { name: /Réinitialiser/ })).not.toBeInTheDocument();
  });

  it('hides the reset button when onReset is provided but showReset is false', () => {
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value={null}
        onChange={() => {}}
        options={baseOptions}
        totalCount={3}
        onReset={() => {}}
        showReset={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /Réinitialiser/ })).not.toBeInTheDocument();
  });

  it('shows the reset button and triggers onReset when shown and clicked', () => {
    const onReset = vi.fn();
    renderWithI18n(
      <FilterChips
        label="MARQUE"
        value="FX"
        onChange={() => {}}
        options={baseOptions}
        totalCount={3}
        onReset={onReset}
        showReset
      />,
    );
    const reset = screen.getByRole('button', { name: /Réinitialiser/ });
    expect(reset).toBeInTheDocument();
    fireEvent.click(reset);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('applies the mono font class when monoLabels is true', () => {
    renderWithI18n(
      <FilterChips
        label="CALIBRE"
        value={null}
        onChange={() => {}}
        options={[{ value: '.22', count: 3 }]}
        totalCount={3}
        monoLabels
      />,
    );
    expect(screen.getByRole('button', { name: '.22 (3)' }).className).toMatch(/font-mono/);
  });
});
