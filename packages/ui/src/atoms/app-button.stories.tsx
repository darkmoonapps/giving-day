import type { Meta, StoryObj } from '@storybook/react';
import { AppButton } from './app-button';

const meta: Meta<typeof AppButton> = {
  title: 'Atoms/AppButton',
  component: AppButton,
};

export default meta;

type Story = StoryObj<typeof AppButton>;

export const Filled: Story = {
  args: {
    children: 'Confirm',
  },
};

export const Light: Story = {
  args: {
    children: 'English',
    variant: 'light',
    size: 'xs',
  },
};
