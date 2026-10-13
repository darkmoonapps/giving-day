import { Badge, type BadgeProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface AppBadgeProps extends BadgeProps {
  children: ReactNode;
}

export function AppBadge({ children, ...props }: AppBadgeProps): JSX.Element {
  return <Badge {...props}>{children}</Badge>;
}
