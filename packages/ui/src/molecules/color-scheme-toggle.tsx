import { Group } from '@mantine/core';
import type { ColorSchemePreference } from '@giving-day/shared';
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { AppButton } from '../atoms';

export interface ColorSchemeOption {
  value: ColorSchemePreference;
  label: string;
  icon: ReactNode;
}

export interface ColorSchemeToggleProps {
  value: ColorSchemePreference;
  onChange: (value: ColorSchemePreference) => void;
  label: string;
  lightLabel: string;
  darkLabel: string;
  systemLabel: string;
}

export function ColorSchemeToggle({
  value,
  onChange,
  label,
  lightLabel,
  darkLabel,
  systemLabel,
}: ColorSchemeToggleProps): JSX.Element {
  const options: readonly ColorSchemeOption[] = [
    {
      value: 'auto',
      label: systemLabel,
      icon: <IconDeviceDesktop size={14} aria-hidden />,
    },
    {
      value: 'light',
      label: lightLabel,
      icon: <IconSun size={14} aria-hidden />,
    },
    {
      value: 'dark',
      label: darkLabel,
      icon: <IconMoon size={14} aria-hidden />,
    },
  ];

  return (
    <Group gap={4} role="group" aria-label={label}>
      {options.map((option) => (
        <AppButton
          key={option.value}
          size="xs"
          variant={option.value === value ? 'filled' : 'light'}
          leftSection={option.icon}
          aria-pressed={option.value === value}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </AppButton>
      ))}
    </Group>
  );
}
