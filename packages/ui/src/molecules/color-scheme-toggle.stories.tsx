import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { ColorSchemePreference } from '@giving-day/shared';
import { ColorSchemeToggle } from './color-scheme-toggle';

const meta: Meta<typeof ColorSchemeToggle> = {
  title: 'Molecules/ColorSchemeToggle',
  component: ColorSchemeToggle,
};

export default meta;

type Story = StoryObj<typeof ColorSchemeToggle>;

function ColorSchemeTogglePlayground(): JSX.Element {
  const [value, setValue] = useState<ColorSchemePreference>('auto');

  return (
    <ColorSchemeToggle
      value={value}
      onChange={setValue}
      label="Color scheme"
      lightLabel="Light"
      darkLabel="Dark"
      systemLabel="System"
    />
  );
}

export const Default: Story = {
  render: () => <ColorSchemeTogglePlayground />,
};
