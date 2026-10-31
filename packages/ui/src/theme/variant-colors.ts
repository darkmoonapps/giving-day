import {
  defaultVariantColorsResolver,
  parseThemeColor,
  type VariantColorsResolver,
} from '@mantine/core';
import { renderedLightBadges } from './colors';

function isOverriddenLightColor(
  color: string
): color is keyof typeof renderedLightBadges {
  return color === 'mint' || color === 'red';
}

export const variantColorResolver: VariantColorsResolver = (input) => {
  const resolved = defaultVariantColorsResolver(input);

  if (input.variant !== 'light') {
    return resolved;
  }

  const parsed = parseThemeColor({
    color: input.color,
    theme: input.theme,
  });

  if (!isOverriddenLightColor(parsed.color)) {
    return resolved;
  }

  return {
    ...resolved,
    color: `var(--mantine-color-${parsed.color}-light-color)`,
    background: `var(--mantine-color-${parsed.color}-light)`,
    hover: `var(--mantine-color-${parsed.color}-light)`,
  };
};
