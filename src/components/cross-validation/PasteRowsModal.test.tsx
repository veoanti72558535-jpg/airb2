import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { PasteRowsModal } from './PasteRowsModal';

function renderModal(props?: Partial<React.ComponentProps<typeof PasteRowsModal>>) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <I18nProvider>
      <PasteRowsModal
        open
        onOpenChange={onOpenChange}
        existingRows={[{ range: 5, drop: 1 }]}
        onConfirm={onConfirm}
        {...props}
      />
    </I18nProvider>,
  );
  return { onConfirm, onOpenChange };
}

function paste(text: string) {
  const ta = screen.getByTestId('paste-rows-textarea') as HTMLTextAreaElement;
  fireEvent.change(ta, { target: { value: text } });
}

describe('PasteRowsModal', () => {
  it('renders the title and an empty textarea', () => {
    renderModal();
    expect(screen.getByTestId('paste-rows-modal')).toBeTruthy();
    expect(screen.queryByTestId('paste-rows-preview')).toBeNull();
  });

  it('shows preview after pasting a valid TSV', async () => {
    renderModal();
    paste('range\tdrop\tvelocity\n10\t3.2\t265\n50\t-19.7\t245');
    await waitFor(() =>
      expect(screen.getByTestId('paste-rows-preview')).toBeTruthy(),
    );
    expect(screen.getByTestId('paste-rows-table')).toBeTruthy();
    expect(screen.getByText(/2 row\(s\) recognised|2 ligne/i)).toBeTruthy();
  });

  it('shows error when range column is missing — no fabrication', async () => {
    renderModal();
    paste('drop,velocity\n1.0,265');
    await waitFor(() =>
      expect(screen.getByTestId('paste-rows-preview')).toBeTruthy(),
    );
    // Confirm button must be disabled (no usable rows).
    expect(
      (screen.getByTestId('paste-rows-confirm') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('append mode keeps existing rows + adds pasted ones', async () => {
    const { onConfirm } = renderModal();
    paste('range,drop\n100,-50\n150,-80');
    await waitFor(() => screen.getByTestId('paste-rows-preview'));
    fireEvent.click(screen.getByTestId('mode-append'));
    fireEvent.click(screen.getByTestId('paste-rows-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const merged = onConfirm.mock.calls[0][0];
    expect(merged).toHaveLength(3); // 1 existing + 2 pasted
    expect(merged[0]).toEqual({ range: 5, drop: 1 });
    expect(merged[2]).toEqual({ range: 150, drop: -80 });
  });

  it('replace mode swaps the rows entirely', async () => {
    const { onConfirm } = renderModal();
    paste('range,drop\n100,-50');
    await waitFor(() => screen.getByTestId('paste-rows-preview'));
    fireEvent.click(screen.getByTestId('mode-replace'));
    fireEvent.click(screen.getByTestId('paste-rows-confirm'));
    const merged = onConfirm.mock.calls[0][0];
    expect(merged).toEqual([{ range: 100, drop: -50 }]);
  });

  it('warns on unknown columns but still allows import', async () => {
    renderModal();
    paste('range,drop,foobar\n10,1,xxx\n20,-2,yyy');
    await waitFor(() => screen.getByTestId('paste-rows-preview'));
    expect(screen.getByText(/column\(s\) ignored|colonne\(s\) ignor/i)).toBeTruthy();
    expect(
      (screen.getByTestId('paste-rows-confirm') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('handles semicolon CSV with comma decimals', async () => {
    renderModal();
    paste('range;drop;velocity\n10;3,2;265,1');
    await waitFor(() => screen.getByTestId('paste-rows-preview'));
    expect(screen.getByText(/Separator|Séparateur/i)).toBeTruthy();
    expect(screen.getByText(/semicolon/)).toBeTruthy();
  });

  it('does not invent values for absent cells', async () => {
    const { onConfirm } = renderModal({ existingRows: [] });
    paste('range\tdrop\tvelocity\n10\t\t265');
    await waitFor(() => screen.getByTestId('paste-rows-preview'));
    fireEvent.click(screen.getByTestId('paste-rows-confirm'));
    const merged = onConfirm.mock.calls[0][0];
    expect(merged[0].drop).toBeUndefined();
    expect(merged[0].velocity).toBe(265);
  });
});