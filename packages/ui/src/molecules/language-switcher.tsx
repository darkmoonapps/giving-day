import { Group } from '@mantine/core';
import type { LanguageCode } from '@giving-day/shared';
import { AppButton } from '../atoms';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
}

export interface LanguageSwitcherProps {
  value: LanguageCode;
  options: readonly LanguageOption[];
  onChange: (language: LanguageCode) => void;
  label: string;
}

export function LanguageSwitcher({
  value,
  options,
  onChange,
  label,
}: LanguageSwitcherProps): JSX.Element {
  return (
    <Group gap="xs" role="group" aria-label={label}>
      {options.map((option) => (
        <AppButton
          key={option.code}
          size="xs"
          variant={option.code === value ? 'filled' : 'light'}
          aria-pressed={option.code === value}
          onClick={() => {
            onChange(option.code);
          }}
        >
          {option.label}
        </AppButton>
      ))}
    </Group>
  );
}
