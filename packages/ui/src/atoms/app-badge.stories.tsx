import type { Meta, StoryObj } from '@storybook/react';
import { AppBadge } from './app-badge';

const meta: Meta<typeof AppBadge> = {
  title: 'Atoms/AppBadge',
  component: AppBadge,
};

export default meta;

type Story = StoryObj<typeof AppBadge>;

export const Healthy: Story = {
  args: {
    children: 'healthy',
    color: 'green',
  },
};

export const Unhealthy: Story = {
  args: {
    children: 'unhealthy',
    color: 'red',
  },
};
