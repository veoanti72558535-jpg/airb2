import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fr' }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/lib/ai/agent-cache', () => ({
  queryAIWithCache: vi.fn(),
}));

vi.mock('@/lib/field-measurements-repo', () => ({
  saveFieldMeasurement: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/target-photo', async () => {
  const actual = await vi.importActual<any>('@/lib/target-photo');
  return {
    ...actual,
    prepareTargetPhoto: vi.fn(() =>
      Promise.resolve({ base64: 'b64', mime: 'image/jpeg', widthPx: 100, heightPx: 100, sizeKb: 5 }),
    ),
  };
});

import { TargetPhotoAnalyzer } from './TargetPhotoAnalyzer';
import { queryAIWithCache } from '@/lib/ai/agent-cache';
import { saveFieldMeasurement } from '@/lib/field-measurements-repo';

const aiMock = vi.mocked(queryAIWithCache);
const saveMock = vi.mocked(saveFieldMeasurement);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeFile(name: string, type: string, size = 1024) {
  const f = new File([new Uint8Array(size)], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('TargetPhotoAnalyzer', () => {
  it('renders the upload UI', () => {
    render(<TargetPhotoAnalyzer />);
    expect(screen.getByTestId('target-dropzone')).toBeInTheDocument();
    expect(screen.getByTestId('target-distance-input')).toBeInTheDocument();
    expect(screen.getByTestId('target-analyze-btn')).toBeDisabled();
  });

  it('rejects non-image files', () => {
    render(<TargetPhotoAnalyzer />);
    const input = screen.getByTestId('target-file-input') as HTMLInputElement;
    const badFile = makeFile('doc.pdf', 'application/pdf');
    fireEvent.change(input, { target: { files: [badFile] } });
    expect(screen.getByTestId('target-error')).toHaveTextContent('target.errInvalidType');
  });

  it('renders low-confidence banner when confidence < 0.5', async () => {
    aiMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: JSON.stringify({
          groupSizeMm: 30, groupSizeMoa: 1, groupSizeMrad: 0.3,
          centerOffsetXmm: 0, centerOffsetYmm: 0,
          correctionMoa: { horizontal: 0, vertical: 0 },
          correctionMrad: { horizontal: 0, vertical: 0 },
          shotCount: null, confidence: 0.2, notes: 'flou', warnings: [],
        }),
        provider: 'p', model: 'm', run_id: 'r1', fromCache: false,
      },
    });

    render(<TargetPhotoAnalyzer distanceM={50} />);
    const input = screen.getByTestId('target-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.jpg', 'image/jpeg')] } });
    fireEvent.click(screen.getByTestId('target-analyze-btn'));

    await waitFor(() => expect(screen.getByTestId('target-low-conf')).toBeInTheDocument());
    expect(screen.getByTestId('target-confidence')).toHaveTextContent('20%');
  });

  it('renders warnings as badges', async () => {
    aiMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: JSON.stringify({
          groupSizeMm: 25, groupSizeMoa: 1, groupSizeMrad: 0.3,
          centerOffsetXmm: 0, centerOffsetYmm: 0,
          correctionMoa: { horizontal: 0, vertical: 0 },
          correctionMrad: { horizontal: 0, vertical: 0 },
          shotCount: 5, confidence: 0.8, notes: 'ok',
          warnings: ['Cible mal centrée', 'Lumière insuffisante'],
        }),
        provider: 'p', model: 'm', run_id: 'r1', fromCache: false,
      },
    });

    render(<TargetPhotoAnalyzer distanceM={50} />);
    const input = screen.getByTestId('target-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.jpg', 'image/jpeg')] } });
    fireEvent.click(screen.getByTestId('target-analyze-btn'));

    await waitFor(() => expect(screen.getByTestId('target-warnings')).toBeInTheDocument());
    const warns = screen.getByTestId('target-warnings');
    expect(warns).toHaveTextContent('Cible mal centrée');
    expect(warns).toHaveTextContent('Lumière insuffisante');
  });

  it('calls saveFieldMeasurement when "link to session" clicked', async () => {
    aiMock.mockResolvedValueOnce({
      ok: true,
      data: {
        text: JSON.stringify({
          groupSizeMm: 22, groupSizeMoa: 1.5, groupSizeMrad: 0.44,
          centerOffsetXmm: 5, centerOffsetYmm: -8,
          correctionMoa: { horizontal: 0.34, vertical: -0.55 },
          correctionMrad: { horizontal: 0.1, vertical: -0.16 },
          shotCount: 5, confidence: 0.87, notes: 'ok', warnings: [],
        }),
        provider: 'p', model: 'm', run_id: 'r1', fromCache: false,
      },
    });

    render(<TargetPhotoAnalyzer sessionId="sess-1" distanceM={50} />);
    const input = screen.getByTestId('target-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.jpg', 'image/jpeg')] } });
    fireEvent.click(screen.getByTestId('target-analyze-btn'));

    await waitFor(() => expect(screen.getByTestId('target-link-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('target-link-btn'));

    await waitFor(() => expect(saveMock).toHaveBeenCalledOnce());
    const call = saveMock.mock.calls[0]?.[0];
    expect(call?.sessionId).toBe('sess-1');
    expect(call?.distanceM).toBe(50);
    expect(call?.measuredWindageMm).toBe(5);
  });
});
