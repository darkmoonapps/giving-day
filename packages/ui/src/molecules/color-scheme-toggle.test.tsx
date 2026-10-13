import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithMantine } from '../test/render';
import { ColorSchemeToggle } from './color-scheme-toggle';

describe('ColorSchemeToggle', () => {
  it('follows the current preference and notifies on change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithMantine(
      <ColorSchemeToggle
        value="auto"
        onChange={onChange}
        label="Color scheme"
        lightLabel="Light"
        darkLabel="Dark"
        systemLabel="System"
      />
    );

    expect(screen.getByRole('group', { name: 'Color scheme' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
