import type { Meta, StoryObj } from '@storybook/react';
import { AppTitle } from './app-title';

const meta: Meta<typeof AppTitle> = {
  title: 'Atoms/AppTitle',
  component: AppTitle,
};

export default meta;

type Story = StoryObj<typeof AppTitle>;

export const PageTitle: Story = {
  args: {
    order: 1,
    children: 'Welcome to Giving Day',
  },
};
