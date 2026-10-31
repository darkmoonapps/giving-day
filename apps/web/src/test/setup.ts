import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
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

HTMLCanvasElement.prototype.getContext =
  function getContext(): CanvasRenderingContext2D {
    return {
      setTransform: (): void => undefined,
      clearRect: (): void => undefined,
      beginPath: (): void => undefined,
      arc: (): void => undefined,
      fill: (): void => undefined,
      globalAlpha: 1,
      fillStyle: '',
    } as CanvasRenderingContext2D;
  };

afterEach(() => {
  cleanup();
});

await initI18n();
