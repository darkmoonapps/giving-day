import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithMantine } from '../test/render';
import { AppButton } from './app-button';

describe('AppButton', () => {
  it('renders the label and handles clicks', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    renderWithMantine(<AppButton onClick={onClick}>Confirm</AppButton>);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
