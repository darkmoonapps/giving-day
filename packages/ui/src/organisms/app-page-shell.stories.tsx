import type { Meta, StoryObj } from '@storybook/react';
import { AppText } from '../atoms';
import { AppHeader } from './app-header';
import { AppPageShell } from './app-page-shell';

const meta: Meta<typeof AppPageShell> = {
  title: 'Organisms/AppPageShell',
  component: AppPageShell,
};

export default meta;

type Story = StoryObj<typeof AppPageShell>;

export const Default: Story = {
  args: {
    header: <AppHeader title="Giving Day" />,
    children: <AppText>Placeholder home content</AppText>,
  },
};
