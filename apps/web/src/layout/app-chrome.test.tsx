import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AppText } from '@giving-day/ui';
import { renderWithProviders } from '../test/render';
import { AppChrome } from './app-chrome';

describe('AppChrome', () => {
  it('exposes a skip link and keeps the brand out of the heading outline', () => {
    renderWithProviders(
      <AppChrome>
        <AppText>Body</AppText>
      </AppChrome>
    );

    expect(screen.getByRole('link', { name: 'דלג לתוכן' })).toHaveAttribute(
      'href',
      '#main-content'
    );
    expect(screen.getByTestId('app-brand')).toHaveTextContent('יום הנתינה');
    expect(
      screen.queryByRole('heading', { name: 'יום הנתינה' })
    ).not.toBeInTheDocument();
  });
});
