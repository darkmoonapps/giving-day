import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppText } from '../atoms';
import { renderWithMantine } from '../test/render';
import { AppHeader } from './app-header';
import { AppPageShell, MAIN_CONTENT_ID } from './app-page-shell';

describe('AppPageShell', () => {
  it('renders a skip link that targets main content', () => {
    renderWithMantine(
      <AppPageShell
        header={<AppHeader title="Giving Day" />}
        skipToContentLabel="Skip to content"
      >
        <AppText>Page body</AppText>
      </AppPageShell>
    );

    const skipLink = screen.getByRole('link', { name: 'Skip to content' });
    expect(skipLink).toHaveAttribute('href', `#${MAIN_CONTENT_ID}`);
    expect(document.getElementById(MAIN_CONTENT_ID)).not.toBeNull();
    expect(screen.getByTestId('app-brand').tagName).toBe('P');
    expect(
      screen.queryByRole('heading', { name: 'Giving Day' })
    ).not.toBeInTheDocument();
  });
});
