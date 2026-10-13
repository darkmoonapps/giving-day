import { Group } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react';
import { ColorSchemeToggle, LanguageSwitcher } from '../molecules';
import { AppHeader } from './app-header';

const meta: Meta<typeof AppHeader> = {
  title: 'Organisms/AppHeader',
  component: AppHeader,
};

export default meta;

type Story = StoryObj<typeof AppHeader>;

export const WithLanguageSwitcher: Story = {
  args: {
    title: 'Giving Day',
    actions: (
      <Group gap="sm">
        <LanguageSwitcher
          value="he"
          onChange={() => undefined}
          label="Language"
          options={[
            { code: 'he', label: 'עברית' },
            { code: 'en', label: 'English' },
          ]}
        />
        <ColorSchemeToggle
          value="auto"
          onChange={() => undefined}
          label="Color scheme"
          lightLabel="Light"
          darkLabel="Dark"
          systemLabel="System"
        />
      </Group>
    ),
  },
};
