import type { Meta, StoryObj } from '@storybook/react';
import { LoadingState } from './loading-state';

const meta: Meta<typeof LoadingState> = {
  title: 'Molecules/LoadingState',
  component: LoadingState,
};

export default meta;

type Story = StoryObj<typeof LoadingState>;

export const Default: Story = {
  args: {
    label: 'Checking API health...',
  },
};
