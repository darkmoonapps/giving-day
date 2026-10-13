import type { Meta, StoryObj } from '@storybook/react';
import { AppText } from './app-text';

const meta: Meta<typeof AppText> = {
  title: 'Atoms/AppText',
  component: AppText,
};

export default meta;

type Story = StoryObj<typeof AppText>;

export const Default: Story = {
  args: {
    children: 'Volunteer management for monthly food-package distribution',
  },
};

export const Dimmed: Story = {
  args: {
    children: 'Last checked: 15/01/2026, 10:00',
    size: 'xs',
    c: 'dimmed',
  },
};
