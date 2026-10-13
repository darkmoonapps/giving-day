import { Loader, type LoaderProps } from '@mantine/core';

export type AppLoaderProps = LoaderProps;

export function AppLoader(props: AppLoaderProps): JSX.Element {
  return <Loader {...props} />;
}
