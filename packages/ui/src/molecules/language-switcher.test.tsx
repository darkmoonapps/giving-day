import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithMantine } from '../test/render';
import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher', () => {
  it('announces the current language and notifies on change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithMantine(
      <LanguageSwitcher
        value="he"
        onChange={onChange}
        label="Language"
        options={[
          { code: 'he', label: 'עברית' },
          { code: 'en', label: 'English' },
        ]}
      />
    );

    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'עברית' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(onChange).toHaveBeenCalledWith('en');
  });
});
