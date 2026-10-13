import { Alert, type AlertProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface AppAlertProps extends AlertProps {
  children: ReactNode;
}

export function AppAlert({ children, ...props }: AppAlertProps): JSX.Element {
  return <Alert {...props}>{children}</Alert>;
}
