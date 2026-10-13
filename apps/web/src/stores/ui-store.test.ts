import { beforeEach, describe, expect, it } from 'vitest';
import { COLOR_SCHEME_STORAGE_KEY } from '@giving-day/shared';
import { useUiStore } from './ui-store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      statusDetailsOpen: true,
      colorScheme: 'auto',
    });
    window.localStorage.clear();
  });

  it('toggles status details visibility', () => {
    expect(useUiStore.getState().statusDetailsOpen).toBe(true);

    useUiStore.getState().toggleStatusDetails();
    expect(useUiStore.getState().statusDetailsOpen).toBe(false);

    useUiStore.getState().setStatusDetailsOpen(true);
    expect(useUiStore.getState().statusDetailsOpen).toBe(true);
  });

  it('defaults to the system color scheme and can save a choice', () => {
    expect(useUiStore.getState().colorScheme).toBe('auto');

    useUiStore.getState().setColorScheme('dark');
    expect(useUiStore.getState().colorScheme).toBe('dark');
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toContain(
      '"colorScheme":"dark"'
    );
  });
});
