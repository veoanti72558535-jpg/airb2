import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value synchronously', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 100));
    expect(result.current).toBe('hello');
  });

  it('updates only after the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 100),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current).toBe('b');
  });

  it('coalesces rapid changes into a single update', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 100),
      { initialProps: { v: '' } },
    );
    rerender({ v: 'a' });
    act(() => void vi.advanceTimersByTime(50));
    rerender({ v: 'ab' });
    act(() => void vi.advanceTimersByTime(50));
    rerender({ v: 'abc' });
    expect(result.current).toBe('');
    act(() => void vi.advanceTimersByTime(110));
    expect(result.current).toBe('abc');
  });

  it('passes the value through immediately when delay <= 0', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 0),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    expect(result.current).toBe('b');
  });
});
