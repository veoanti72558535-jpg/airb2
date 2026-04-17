import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '@/components/SearchBar';
import { I18nProvider } from '@/lib/i18n';

// Mock toast to avoid mounting the Toaster in unit tests
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('placeholder & input', () => {
    it('renders the provided placeholder on the input', () => {
      renderWithI18n(
        <SearchBar value="" onChange={() => {}} placeholder="Search airguns…" />,
      );
      expect(screen.getByPlaceholderText('Search airguns…')).toBeInTheDocument();
    });

    it('uses the placeholder as default aria-label when ariaLabel is omitted', () => {
      renderWithI18n(
        <SearchBar value="" onChange={() => {}} placeholder="Search airguns…" />,
      );
      expect(screen.getByLabelText('Search airguns…')).toBeInTheDocument();
    });

    it('prefers the explicit ariaLabel over the placeholder', () => {
      renderWithI18n(
        <SearchBar
          value=""
          onChange={() => {}}
          placeholder="Search airguns…"
          ariaLabel="Airgun search"
        />,
      );
      expect(screen.getByLabelText('Airgun search')).toBeInTheDocument();
    });

    it('reflects the controlled value and emits changes via onChange', () => {
      const onChange = vi.fn();
      renderWithI18n(<SearchBar value="FX" onChange={onChange} placeholder="Search" />);
      const input = screen.getByPlaceholderText('Search') as HTMLInputElement;
      expect(input.value).toBe('FX');
      fireEvent.change(input, { target: { value: 'Daystate' } });
      expect(onChange).toHaveBeenCalledWith('Daystate');
    });

    it('shows a clear button only when value is non-empty and clears on click', () => {
      const onChange = vi.fn();
      const { rerender } = renderWithI18n(
        <SearchBar value="" onChange={onChange} placeholder="Search" />,
      );
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

      rerender(
        <I18nProvider>
          <SearchBar value="FX" onChange={onChange} placeholder="Search" />
        </I18nProvider>,
      );
      const clear = screen.getByLabelText('Clear search');
      fireEvent.click(clear);
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('counter X / Y', () => {
    it('does not render the counter when count or total is missing', () => {
      renderWithI18n(<SearchBar value="" onChange={() => {}} placeholder="Search" />);
      expect(screen.queryByText(/\/\s*\d+/)).not.toBeInTheDocument();
    });

    it('renders "X / Y" with neutral styles when there are matches', () => {
      renderWithI18n(
        <SearchBar value="" onChange={() => {}} placeholder="Search" count={3} total={10} />,
      );
      const counter = screen.getByText('3 / 10');
      expect(counter).toBeInTheDocument();
      expect(counter.className).toMatch(/text-muted-foreground/);
      expect(counter.className).not.toMatch(/text-destructive/);
    });

    it('switches the counter to the destructive variant when count is 0', () => {
      renderWithI18n(
        <SearchBar value="" onChange={() => {}} placeholder="Search" count={0} total={10} />,
      );
      const counter = screen.getByText('0 / 10');
      expect(counter.className).toMatch(/text-destructive/);
    });

    it('marks the counter as a polite aria-live region', () => {
      renderWithI18n(
        <SearchBar value="" onChange={() => {}} placeholder="Search" count={1} total={2} />,
      );
      const counter = screen.getByText('1 / 2');
      expect(counter.getAttribute('aria-live')).toBe('polite');
      expect(counter.getAttribute('aria-atomic')).toBe('true');
    });
  });

  describe('copy-link button', () => {
    it('is hidden by default', () => {
      renderWithI18n(<SearchBar value="" onChange={() => {}} placeholder="Search" />);
      expect(screen.queryByLabelText(/Copier le lien/i)).not.toBeInTheDocument();
    });

    it('is visible when showCopyLink is true', () => {
      renderWithI18n(
        <SearchBar value="" onChange={() => {}} placeholder="Search" showCopyLink />,
      );
      expect(screen.getByLabelText(/Copier le lien/i)).toBeInTheDocument();
    });

    it('writes the current URL to the clipboard and shows a "copied" state', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });

      renderWithI18n(
        <SearchBar value="" onChange={() => {}} placeholder="Search" showCopyLink />,
      );
      const btn = screen.getByLabelText(/Copier le lien/i);
      fireEvent.click(btn);

      await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
      // After copy success the button gets the primary tint
      await waitFor(() => expect(btn.className).toMatch(/border-primary/));
    });

    it('falls back to execCommand when navigator.clipboard is unavailable', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
      const exec = vi.fn().mockReturnValue(true);
      // execCommand is not in jsdom's typings — patch it explicitly
      (document as unknown as { execCommand: typeof exec }).execCommand = exec;

      renderWithI18n(
        <SearchBar value="" onChange={() => {}} placeholder="Search" showCopyLink />,
      );
      fireEvent.click(screen.getByLabelText(/Copier le lien/i));

      await waitFor(() => expect(exec).toHaveBeenCalledWith('copy'));
    });
  });
});
