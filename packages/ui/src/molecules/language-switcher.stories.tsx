import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { LanguageCode } from '@giving-day/shared';
import { LanguageSwitcher } from './language-switcher';

const meta: Meta<typeof LanguageSwitcher> = {
  title: 'Molecules/LanguageSwitcher',
  component: LanguageSwitcher,
};

export default meta;

type Story = StoryObj<typeof LanguageSwitcher>;

function LanguageSwitcherPlayground(): JSX.Element {
  const [value, setValue] = useState<LanguageCode>('he');

  return (
    <LanguageSwitcher
      value={value}
      onChange={setValue}
      label="Language"
      options={[
        { code: 'he', label: 'עברית' },
        { code: 'en', label: 'English' },
      ]}
    />
  );
}

export const Default: Story = {
  render: () => <LanguageSwitcherPlayground />,
};
