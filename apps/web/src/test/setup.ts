import '@testing-library/jest-dom/vitest';
import { initI18n } from '../i18n';

class ResizeObserverMock {
  observe(): void {
    return;
  }

  unobserve(): void {
    return;
  }

  disconnect(): void {
    return;
  }
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
      dispatchEvent: (): boolean => false,
    }) as MediaQueryList,
});

globalThis.ResizeObserver = ResizeObserverMock;

await initI18n();
