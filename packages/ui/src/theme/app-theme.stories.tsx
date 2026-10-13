import { Card, Group, Stack } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react';
import { AppBadge, AppButton, AppText, AppTitle } from '../atoms';
import { AppThemeProvider } from './app-theme-provider';
import { MINT_BRAND, PLUM_BACKGROUND, WISTERIA_BRAND } from './colors';

const meta: Meta = {
  title: 'Theme/Wisteria and mint',
};

export default meta;

type Story = StoryObj;

function ThemePreview({ title }: { title: string }): JSX.Element {
  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="md">
        <AppTitle order={3}>{title}</AppTitle>
        <AppText>
          Pastel wisteria primary {WISTERIA_BRAND} with mint {MINT_BRAND} for
          success and Delivered states.
        </AppText>
        <Group>
          <AppButton>Primary action</AppButton>
          <AppButton variant="light">Secondary</AppButton>
          <AppBadge color="mint" variant="light">
            Delivered
          </AppBadge>
          <AppBadge color="wisteria" variant="light">
            Wisteria
          </AppBadge>
        </Group>
        <AppText c="dimmed" size="sm">
          Deep plum background token {PLUM_BACKGROUND} is used in dark mode.
        </AppText>
      </Stack>
    </Card>
  );
}

export const LightWisteriaAndMint: Story = {
  name: 'Light — Wisteria & mint',
  render: () => <ThemePreview title="Wisteria & mint" />,
};

export const DarkDeepPlum: Story = {
  name: 'Dark — Deep plum',
  globals: { theme: 'dark' },
  render: () => <ThemePreview title="Deep plum" />,
};

export const BothThemes: Story = {
  name: 'Light and dark side by side',
  render: () => (
    <Group align="stretch" grow>
      <AppThemeProvider forceColorScheme="light">
        <ThemePreview title="Wisteria & mint" />
      </AppThemeProvider>
      <AppThemeProvider forceColorScheme="dark">
        <ThemePreview title="Deep plum" />
      </AppThemeProvider>
    </Group>
  ),
};
