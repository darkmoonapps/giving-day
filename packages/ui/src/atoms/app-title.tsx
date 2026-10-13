import { Title, type TitleProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface AppTitleProps extends TitleProps {
  children: ReactNode;
}

export function AppTitle({ children, ...props }: AppTitleProps): JSX.Element {
  return <Title {...props}>{children}</Title>;
}
