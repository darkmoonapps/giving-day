import type { Meta, StoryObj } from '@storybook/react';
import { AppAlert } from './app-alert';

const meta: Meta<typeof AppAlert> = {
  title: 'Atoms/AppAlert',
  component: AppAlert,
};

export default meta;

type Story = StoryObj<typeof AppAlert>;

export const Error: Story = {
  args: {
    title: 'Error',
    color: 'red',
    children: 'Failed to fetch health',
  },
};
