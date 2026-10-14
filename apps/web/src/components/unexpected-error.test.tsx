import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { i18n } from '../i18n';
import { renderWithProviders } from '../test/render';
import { UnexpectedError } from './unexpected-error';

describe('UnexpectedError', () => {
  it('renders translated copy and calls onReset', async () => {
    await i18n.changeLanguage('en');
    const onReset = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<UnexpectedError onReset={onReset} />);

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('unexpected-error')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
