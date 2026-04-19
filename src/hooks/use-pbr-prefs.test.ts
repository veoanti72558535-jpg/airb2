import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  usePbrPrefs,
  DEFAULT_PBR_VITAL_ZONE_M,
  __PBR_PREFS_KEY,
} from './use-pbr-prefs';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('usePbrPrefs — Tranche Q', () => {
  it('expose le défaut quand rien n\'est persisté', () => {
    const { result } = renderHook(() => usePbrPrefs());
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
  });

  it('persiste la valeur en localStorage en mètres', () => {
    const { result } = renderHook(() => usePbrPrefs());
    act(() => {
      result.current.setVitalZoneM(0.08);
    });
    expect(result.current.vitalZoneM).toBe(0.08);
    expect(JSON.parse(localStorage.getItem(__PBR_PREFS_KEY)!)).toBe(0.08);
  });

  it('relit la valeur persistée au montage', () => {
    localStorage.setItem(__PBR_PREFS_KEY, JSON.stringify(0.12));
    const { result } = renderHook(() => usePbrPrefs());
    expect(result.current.vitalZoneM).toBe(0.12);
  });

  it('ignore une valeur négative ou nulle', () => {
    const { result } = renderHook(() => usePbrPrefs());
    act(() => {
      result.current.setVitalZoneM(-0.5);
    });
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
    act(() => {
      result.current.setVitalZoneM(0);
    });
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
  });

  it('ignore une valeur non-finie', () => {
    const { result } = renderHook(() => usePbrPrefs());
    act(() => {
      result.current.setVitalZoneM(Number.NaN);
    });
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
    act(() => {
      result.current.setVitalZoneM(Number.POSITIVE_INFINITY);
    });
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
  });

  it('retombe sur le défaut si JSON corrompu', () => {
    localStorage.setItem(__PBR_PREFS_KEY, '{not json');
    const { result } = renderHook(() => usePbrPrefs());
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
  });

  it('retombe sur le défaut si la valeur stockée n\'est pas un nombre', () => {
    localStorage.setItem(__PBR_PREFS_KEY, JSON.stringify('haha'));
    const { result } = renderHook(() => usePbrPrefs());
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
  });

  it('reset revient au défaut et écrit dans le storage', () => {
    const { result } = renderHook(() => usePbrPrefs());
    act(() => {
      result.current.setVitalZoneM(0.1);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
    expect(JSON.parse(localStorage.getItem(__PBR_PREFS_KEY)!)).toBe(
      DEFAULT_PBR_VITAL_ZONE_M,
    );
  });

  it('synchronise deux instances via l\'évènement storage', () => {
    const a = renderHook(() => usePbrPrefs());
    const b = renderHook(() => usePbrPrefs());
    act(() => {
      localStorage.setItem(__PBR_PREFS_KEY, JSON.stringify(0.07));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: __PBR_PREFS_KEY,
          newValue: JSON.stringify(0.07),
        }),
      );
    });
    expect(a.result.current.vitalZoneM).toBe(0.07);
    expect(b.result.current.vitalZoneM).toBe(0.07);
  });

  it('ignore un évènement storage pour une autre clé', () => {
    const { result } = renderHook(() => usePbrPrefs());
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'autre', newValue: 'x' }),
      );
    });
    expect(result.current.vitalZoneM).toBe(DEFAULT_PBR_VITAL_ZONE_M);
  });
});
