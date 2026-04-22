import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return { maybeSingle: mockMaybeSingle };
          },
        };
      },
      update: (payload: unknown) => {
        mockUpdate(payload);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return Promise.resolve({ error: null });
          },
        };
      },
    })),
  },
}));

// Mock storage
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

import { pullPreferences, pushPreferences } from './preferences-sync';
import { saveSettings } from './storage';

describe('preferences-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pullPreferences', () => {
    it('merges Supabase profile into localStorage', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { unit_system: 'imperial', energy_threshold_j: 7.5, feature_flags: { ai: true, weather: false } },
        error: null,
      });

      await pullPreferences('user-123');

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          unitSystem: 'imperial',
          energyThresholdJ: 7.5,
          featureFlags: { ai: true, weather: false },
        }),
      );
    });

    it('does nothing on Supabase error', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'fail' } });

      await pullPreferences('user-123');

      expect(saveSettings).not.toHaveBeenCalled();
    });
  });

  describe('pushPreferences', () => {
    it('writes current settings to Supabase', async () => {
      mockEq.mockResolvedValue({ error: null });

      await pushPreferences('user-456');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_system: 'metric',
          energy_threshold_j: 16.27,
          feature_flags: { ai: false, weather: true },
        }),
      );
    });
  });
});