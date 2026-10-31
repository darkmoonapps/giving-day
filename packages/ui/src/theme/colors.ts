import type { MantineColorsTuple } from '@mantine/core';

export const WISTERIA_BRAND = '#A99BE0';
export const MINT_BRAND = '#A8E6CF';
export const PLUM_BACKGROUND = '#1E1A2E';

export const wisteria: MantineColorsTuple = [
  '#F8F5FC',
  '#EEE7F8',
  '#DED3F2',
  '#C4B6E8',
  WISTERIA_BRAND,
  '#8B76D0',
  '#6A54B5',
  '#544194',
  '#423474',
  '#2E2452',
];

export const mint: MantineColorsTuple = [
  '#F3FBF8',
  '#DFF5EC',
  '#C5EDDC',
  MINT_BRAND,
  '#7DD4B3',
  '#4EBE94',
  '#2F9A74',
  '#247A5C',
  '#1C5E47',
  '#144533',
];

export const plum: MantineColorsTuple = [
  '#F4F0FA',
  '#E3DDEC',
  '#C6BED8',
  '#A79DBE',
  '#7D7396',
  '#564D72',
  '#3A3454',
  '#2A2540',
  PLUM_BACKGROUND,
  '#141022',
];

export const themeTokens = {
  light: {
    body: wisteria[0],
    paper: '#FFFFFF',
    text: plum[8],
    dimmed: '#5A5470',
    primaryFilled: wisteria[6],
    primaryFilledText: '#FFFFFF',
    successBackground: mint[1],
    successText: mint[7],
    accent: WISTERIA_BRAND,
    successAccent: MINT_BRAND,
  },
  dark: {
    body: PLUM_BACKGROUND,
    paper: plum[7],
    text: plum[0],
    dimmed: plum[2],
    primaryFilled: wisteria[6],
    primaryFilledText: '#FFFFFF',
    successBackground: '#1F4A3A',
    successText: '#C8F5E4',
    accent: '#C4B6E8',
    successAccent: '#C5EDDC',
  },
} as const;

export const MANTINE_RED_1 = '#ffe3e3';
export const MANTINE_RED_9 = '#c92a2a';

export const renderedLightBadges = {
  mint: {
    color: mint[7],
    background: mint[1],
  },
  red: {
    color: MANTINE_RED_9,
    background: MANTINE_RED_1,
  },
} as const;

export const renderedDarkBadges = {
  mint: {
    color: themeTokens.dark.successText,
    background: themeTokens.dark.successBackground,
  },
  red: {
    color: '#FFC9C9',
    background: '#5C1A1A',
  },
} as const;

export const SEMANTIC_COLORS = {
  success: 'mint',
  delivered: 'mint',
} as const;
