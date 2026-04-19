import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { useVirtualList } from './use-virtual-list';

/**
 * jsdom doesn't lay things out, so `clientHeight` defaults to 0 and we hit
 * the `effectiveViewport = itemHeight * 12` fallback. We exercise both that
 * fallback and the scroll-driven windowing.
 */

interface HarnessState {
  startIndex: number;
  endIndex: number;
  paddingTop: number;
  paddingBottom: number;
  totalHeight: number;
  containerEl: HTMLDivElement | null;
}

function Harness({
  itemCount,
  itemHeight,
  overscan,
  onState,
}: {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  onState: (s: HarnessState) => void;
}) {
  const v = useVirtualList({ itemCount, itemHeight, overscan });
  React.useEffect(() => {
    onState({
      startIndex: v.startIndex,
      endIndex: v.endIndex,
      paddingTop: v.paddingTop,
      paddingBottom: v.paddingBottom,
      totalHeight: v.totalHeight,
      containerEl: v.containerRef.current,
    });
  });
  return (
    <div
      ref={v.containerRef}
      data-testid="container"
      style={{ height: 200, overflow: 'auto' }}
    >
      <div style={{ height: v.totalHeight }} />
    </div>
  );
}

describe('useVirtualList', () => {
  it('returns 0 indices when itemCount is 0', () => {
    const onState = vi.fn();
    render(<Harness itemCount={0} itemHeight={50} onState={onState} />);
    const last = onState.mock.calls.at(-1)![0] as HarnessState;
    expect(last.startIndex).toBe(0);
    expect(last.endIndex).toBe(0);
    expect(last.totalHeight).toBe(0);
  });

  it('falls back to a default viewport when clientHeight is 0 (jsdom)', () => {
    const onState = vi.fn();
    render(<Harness itemCount={1000} itemHeight={50} overscan={4} onState={onState} />);
    const last = onState.mock.calls.at(-1)![0] as HarnessState;
    // 12 items * 50px fallback + 8 overscan rows → strictly less than the full list
    expect(last.startIndex).toBe(0);
    expect(last.endIndex).toBeGreaterThan(0);
    expect(last.endIndex).toBeLessThan(1000);
    expect(last.totalHeight).toBe(50_000);
  });

  it('advances startIndex when the container scrolls', () => {
    const onState = vi.fn();
    render(<Harness itemCount={1000} itemHeight={50} overscan={2} onState={onState} />);
    const initial = onState.mock.calls.at(-1)![0] as HarnessState;
    expect(initial.startIndex).toBe(0);

    const container = initial.containerEl as HTMLDivElement;
    act(() => {
      container.scrollTop = 5_000;
      container.dispatchEvent(new Event('scroll'));
    });
    const after = onState.mock.calls.at(-1)![0] as HarnessState;
    // 5000 / 50 = 100, minus overscan 2 → start ≈ 98
    expect(after.startIndex).toBeGreaterThanOrEqual(95);
    expect(after.startIndex).toBeLessThanOrEqual(100);
    expect(after.paddingTop).toBeGreaterThan(0);
    expect(after.paddingBottom).toBeGreaterThan(0);
  });
});
