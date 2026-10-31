import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { i18n } from '../i18n';
import { renderWithProviders } from '../test/render';
import { mapsDeepLinks } from './navigation-links';
import { NavigateMenu } from './navigate-menu';

const QUERY = '12 Example St 12, Holon';
const HINTS = 'Entrance B, Code 1234';

describe('NavigateMenu', () => {
  afterEach(async () => {
    await i18n.changeLanguage('he');
  });

  it('opens Google Maps, Apple Maps, and Waze links for a Holon address', async () => {
    const user = userEvent.setup();
    const links = mapsDeepLinks(QUERY);

    renderWithProviders(
      <NavigateMenu
        query={QUERY}
        visibleHints={HINTS}
        label="Navigate"
        ariaLabel="Navigate to Rivkah Levi"
        testId="navigate-menu"
      />
    );

    await user.click(screen.getByTestId('navigate-menu'));

    const google = await screen.findByTestId('navigate-menu-google');
    const apple = screen.getByTestId('navigate-menu-apple');
    const waze = screen.getByTestId('navigate-menu-waze');

    expect(google).toHaveAttribute('href', links.google);
    expect(apple).toHaveAttribute('href', links.apple);
    expect(waze).toHaveAttribute('href', links.waze);
    expect(google).toHaveAttribute('target', '_blank');
    expect(google).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('navigate-menu-hints')).toHaveTextContent(HINTS);
    expect(google.getAttribute('href')).not.toContain('Entrance');
    expect(waze.getAttribute('href')).not.toContain('1234');
  });

  it('renders nothing when the address cannot be searched', () => {
    renderWithProviders(
      <NavigateMenu
        query={null}
        label="Navigate"
        ariaLabel="Navigate"
        testId="navigate-menu"
      />
    );

    expect(screen.queryByTestId('navigate-menu')).not.toBeInTheDocument();
  });

  it('uses English labels in LTR', async () => {
    await i18n.changeLanguage('en');
    const user = userEvent.setup();

    renderWithProviders(
      <NavigateMenu
        query={QUERY}
        label="Navigate"
        ariaLabel="Navigate to Rivkah Levi"
        testId="navigate-menu"
      />
    );

    expect(document.documentElement.dir).toBe('ltr');
    await user.click(screen.getByTestId('navigate-menu'));
    expect(await screen.findByTestId('navigate-menu-google')).toHaveTextContent(
      'Google Maps'
    );
    expect(screen.getByTestId('navigate-menu-apple')).toHaveTextContent(
      'Apple Maps'
    );
    expect(screen.getByTestId('navigate-menu-waze')).toHaveTextContent('Waze');
  });
});
