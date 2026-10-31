import { describe, expect, it } from 'vitest';
import { GIVING_DAY_THEME_ATTRIBUTE } from '@giving-day/shared';
import { renderWithMantine } from '../test/render';
import { AppText } from '../atoms';

describe('AppThemeProvider', () => {
  it('marks the Holon default brand theme on the document', () => {
    renderWithMantine(<AppText>Wisteria</AppText>);

    expect(document.documentElement).toHaveAttribute(
      GIVING_DAY_THEME_ATTRIBUTE,
      'wisteria-mint'
    );
  });
});
