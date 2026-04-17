import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useUrlFilter } from '@/hooks/use-url-filter';

function makeWrapper(initialEntries: string[]) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

/**
 * Helper hook combining useUrlFilter with useLocation so tests can assert
 * on both the value and the resulting URL search string.
 */
function useFilterWithSearch(key: string) {
  const [value, setValue] = useUrlFilter(key);
  const { search } = useLocation();
  return { value, setValue, search };
}

describe('useUrlFilter', () => {
  it('reads the param value when present in the URL', () => {
    const { result } = renderHook(() => useUrlFilter('brand'), {
      wrapper: makeWrapper(['/?brand=FX']),
    });
    expect(result.current[0]).toBe('FX');
  });

  it('returns null when the param is absent', () => {
    const { result } = renderHook(() => useUrlFilter('brand'), {
      wrapper: makeWrapper(['/']),
    });
    expect(result.current[0]).toBeNull();
  });

  it('writes the param to the URL when given a non-empty string', () => {
    const { result } = renderHook(() => useFilterWithSearch('brand'), {
      wrapper: makeWrapper(['/']),
    });
    act(() => result.current.setValue('FX'));
    expect(result.current.value).toBe('FX');
    expect(result.current.search).toBe('?brand=FX');
  });

  it('removes the param when set to null', () => {
    const { result } = renderHook(() => useFilterWithSearch('brand'), {
      wrapper: makeWrapper(['/?brand=FX']),
    });
    act(() => result.current.setValue(null));
    expect(result.current.value).toBeNull();
    expect(result.current.search).toBe('');
  });

  it('removes the param when set to an empty string', () => {
    const { result } = renderHook(() => useFilterWithSearch('brand'), {
      wrapper: makeWrapper(['/?brand=FX']),
    });
    act(() => result.current.setValue(''));
    expect(result.current.value).toBeNull();
    expect(result.current.search).toBe('');
  });

  it('preserves other params when writing or deleting', () => {
    const { result } = renderHook(() => useFilterWithSearch('brand'), {
      wrapper: makeWrapper(['/?tab=airguns&caliber=.22']),
    });

    act(() => result.current.setValue('FX'));
    const params = new URLSearchParams(result.current.search);
    expect(params.get('tab')).toBe('airguns');
    expect(params.get('caliber')).toBe('.22');
    expect(params.get('brand')).toBe('FX');

    act(() => result.current.setValue(null));
    const after = new URLSearchParams(result.current.search);
    expect(after.get('tab')).toBe('airguns');
    expect(after.get('caliber')).toBe('.22');
    expect(after.has('brand')).toBe(false);
  });

  it('overwrites an existing param value', () => {
    const { result } = renderHook(() => useFilterWithSearch('brand'), {
      wrapper: makeWrapper(['/?brand=FX']),
    });
    act(() => result.current.setValue('Daystate'));
    expect(result.current.value).toBe('Daystate');
    expect(result.current.search).toBe('?brand=Daystate');
  });

  it('multiple independent useUrlFilter instances coexist on the same URL', () => {
    const wrapper = makeWrapper(['/?tab=airguns']);
    const { result } = renderHook(
      () => {
        const [brand, setBrand] = useUrlFilter('brand');
        const [caliber, setCaliber] = useUrlFilter('caliber');
        const { search } = useLocation();
        return { brand, setBrand, caliber, setCaliber, search };
      },
      { wrapper },
    );
    act(() => result.current.setBrand('FX'));
    act(() => result.current.setCaliber('.22'));
    const params = new URLSearchParams(result.current.search);
    expect(params.get('tab')).toBe('airguns');
    expect(params.get('brand')).toBe('FX');
    expect(params.get('caliber')).toBe('.22');
  });
});
