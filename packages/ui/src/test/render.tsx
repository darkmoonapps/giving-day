import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AppThemeProvider } from '../theme';

export function renderWithMantine(ui: ReactElement): RenderResult {
  return render(
    <AppThemeProvider defaultColorScheme="light">{ui}</AppThemeProvider>
  );
}
