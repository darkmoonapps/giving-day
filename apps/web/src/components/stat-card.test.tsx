import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('exposes an accessible group name from the label and value', () => {
    renderWithProviders(
      <StatCard testId="stat-card-example" label="Closed days" value={2} />
    );

    expect(
      screen.getByRole('group', { name: 'Closed days: 2' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-example')).toHaveTextContent(
      'Closed days'
    );
    expect(screen.getByTestId('stat-card-example-value')).toHaveTextContent(
      '2'
    );
  });
});
