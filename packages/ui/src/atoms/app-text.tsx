import { Text, type TextProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface AppTextProps extends TextProps {
  children: ReactNode;
}

export function AppText({ children, ...props }: AppTextProps): JSX.Element {
  return <Text {...props}>{children}</Text>;
}
