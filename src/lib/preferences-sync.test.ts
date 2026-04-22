import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockMaybeSingle }),
      }),
      update: (payload: unknown) => {
        mockUpdate(payload);
        return {
          eq: (...args: unknown[]) => {
            mockUpdateEq(...args);
            return Promise.resolve({ error: null });
          },
        };
      },
    })),
  },
}));

const mockSettings = {
  unitSystem: 'metric' as const,
  advancedMode: false,
  featureFlags: { ai: false, weather: true },
  energyThresholdJ: 16.27,
};
vi.mock('./storage', () => ({
  getSettings: vi.fn(() => ({ ...mockSettings })),
  saveSettings: vi.fn(),
}));

import {
  loadPreferencesFromSupabase,
  savePreferenceToSupabase,
  syncPreferencesOnLogin,
} from './preferences-sync';
import { saveSettings } from './storage';

describe('preferences-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('loadPreferencesFromSupabase', () => {
    it('merges Supabase profile into localStorage', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { unit_system: 'imperial', energy_threshold_j: 7.5, display_name: null, updated_at: '2026-01-01T00:00:00Z' },
        error: null,
      });

      await loadPreferencesFromSupabase('user-123');

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ unitSystem: 'imperial', energyThresholdJ: 7.5 }),
      );
    });

    it('does nothing on Supabase error', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'fail' } });

      await loadPreferencesFromSupabase('user-123');

      expect(saveSettings).not.toHaveBeenCalled();
    });
  });

  describe('savePreferenceToSupabase', () => {
    it('calls supabase update with correct key/value', async () => {
      await savePreferenceToSupabase('user-456', 'unit_system', 'imperial');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ unit_system: 'imperial' }),
      );
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-456');
    });
  });

  describe('syncPreferencesOnLogin', () => {
    it('pulls from Supabase when remote is newer', async () => {
      localStorage.setItem('pcp-settings-updated-at', '2020-01-01T00:00:00Z');
      mockMaybeSingle.mockResolvedValue({
        data: { unit_system: 'imperial', energy_threshold_j: 7.5, display_name: null, updated_at: '2026-04-22T00:00:00Z' },
        error: null,
      });

      await syncPreferencesOnLogin('user-789');

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ unitSystem: 'imperial', energyThresholdJ: 7.5 }),
      );
    });

    it('pushes to Supabase when local is newer', async () => {
      localStorage.setItem('pcp-settings-updated-at', '2026-12-01T00:00:00Z');
      mockMaybeSingle.mockResolvedValue({
        data: { unit_system: 'metric', energy_threshold_j: 16.27, display_name: null, updated_at: '2020-01-01T00:00:00Z' },
        error: null,
      });

      await syncPreferencesOnLogin('user-789');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ unit_system: 'metric', energy_threshold_j: 16.27 }),
      );
    });
  });
});