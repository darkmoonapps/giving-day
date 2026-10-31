import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { Fireworks } from './fireworks';

describe('Fireworks', () => {
  afterEach(() => {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: (): void => undefined,
        removeListener: (): void => undefined,
        addEventListener: (): void => undefined,
        removeEventListener: (): void => undefined,
        dispatchEvent: (): boolean => false,
      }) as MediaQueryList;
  });

  it('renders a decorative canvas when motion is allowed', () => {
    renderWithProviders(<Fireworks reduceMotion={false} />);

    const canvas = screen.getByTestId('fireworks-canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByTestId('fireworks-static')).not.toBeInTheDocument();
  });

  it('renders a static decoration when motion is reduced', () => {
    renderWithProviders(<Fireworks reduceMotion={true} />);

    const staticLayer = screen.getByTestId('fireworks-static');
    expect(staticLayer).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByTestId('fireworks-canvas')).not.toBeInTheDocument();
  });
});
