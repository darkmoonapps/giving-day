import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately and updates after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: 'Y', delayMs: 300 } }
    );

    expect(result.current).toBe('Y');

    rerender({ value: 'Yo', delayMs: 300 });
    expect(result.current).toBe('Y');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('Y');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('Yo');
  });

  it('resets the timer when the value changes before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'Y' } }
    );

    rerender({ value: 'Yo' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'Yon' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('Y');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('Yon');
  });
});
