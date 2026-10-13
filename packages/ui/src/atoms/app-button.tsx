import { Button, type ButtonProps } from '@mantine/core';
import type { MouseEventHandler, ReactNode } from 'react';

export interface AppButtonProps extends ButtonProps {
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLButtonElement>;
  'aria-pressed'?: boolean;
}

export function AppButton({
  children,
  type = 'button',
  ...props
}: AppButtonProps): JSX.Element {
  return (
    <Button type={type} {...props}>
      {children}
    </Button>
  );
}
