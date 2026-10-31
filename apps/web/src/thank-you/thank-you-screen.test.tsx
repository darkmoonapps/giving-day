import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { i18n } from '../i18n';
import { renderWithProviders } from '../test/render';
import { ThankYouScreen } from './thank-you-screen';

describe('ThankYouScreen', () => {
  afterEach(async () => {
    await i18n.changeLanguage('he');
  });

  it('shows confirm copy and dismisses with the continue button', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ThankYouScreen reason="confirmed" onDismiss={onDismiss} />
    );

    const dialog = await screen.findByTestId('fireworks-thank-you');
    expect(dialog).toHaveAttribute('data-thank-you-reason', 'confirmed');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'תודה רבה!'
    );
    expect(screen.getByText('אישרתם השתתפות ביום החלוקה.')).toBeInTheDocument();

    await user.click(screen.getByTestId('thank-you-continue'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses a static decoration when the user prefers reduced motion', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: (): void => undefined,
        removeListener: (): void => undefined,
        addEventListener: (): void => undefined,
        removeEventListener: (): void => undefined,
        dispatchEvent: (): boolean => false,
      }) as MediaQueryList;

    try {
      renderWithProviders(
        <ThankYouScreen reason="confirmed" onDismiss={vi.fn()} />
      );
      expect(await screen.findByTestId('fireworks-static')).toBeInTheDocument();
      expect(screen.queryByTestId('fireworks-canvas')).not.toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('shows finished-delivery copy in English', async () => {
    await i18n.changeLanguage('en');
    const onDismiss = vi.fn();

    renderWithProviders(
      <ThankYouScreen reason="finished" onDismiss={onDismiss} />
    );

    expect(await screen.findByTestId('fireworks-thank-you')).toHaveAttribute(
      'data-thank-you-reason',
      'finished'
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Thank you!'
    );
    expect(
      screen.getByText('You finished every delivery for this day.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue' })
    ).toBeInTheDocument();
  });
});
