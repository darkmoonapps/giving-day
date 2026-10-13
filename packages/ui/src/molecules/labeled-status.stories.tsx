import type { Meta, StoryObj } from '@storybook/react';
import { LabeledStatus } from './labeled-status';

const meta: Meta<typeof LabeledStatus> = {
  title: 'Molecules/LabeledStatus',
  component: LabeledStatus,
};

export default meta;

type Story = StoryObj<typeof LabeledStatus>;

export const Connected: Story = {
  args: {
    label: 'Database:',
    value: 'Connected',
    color: 'green',
  },
};
