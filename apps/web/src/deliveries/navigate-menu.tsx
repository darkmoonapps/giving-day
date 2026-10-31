import { Menu } from '@mantine/core';
import { AppButton } from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { mapsDeepLinks } from './navigation-links';

export function NavigateMenu({
  query,
  visibleHints,
  label,
  ariaLabel,
  testId,
}: {
  query: string | null;
  visibleHints?: string;
  label: string;
  ariaLabel: string;
  testId: string;
}): JSX.Element | null {
  const { t } = useTranslation('volunteer');

  if (query === null) {
    return null;
  }

  const links = mapsDeepLinks(query);
  const hints = visibleHints !== undefined ? visibleHints.trim() : '';

  return (
    <Menu
      shadow="sm"
      width={260}
      position="bottom-start"
      transitionProps={{ duration: 0 }}
    >
      <Menu.Target>
        <AppButton
          size="sm"
          variant="light"
          data-testid={testId}
          aria-label={ariaLabel}
          aria-haspopup="menu"
        >
          {label}
        </AppButton>
      </Menu.Target>
      <Menu.Dropdown data-testid={`${testId}-dropdown`}>
        {hints.length > 0 ? (
          <Menu.Label data-testid={`${testId}-hints`}>{hints}</Menu.Label>
        ) : null}
        <Menu.Item
          component="a"
          href={links.google}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testId}-google`}
        >
          {t('navigate_google')}
        </Menu.Item>
        <Menu.Item
          component="a"
          href={links.apple}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testId}-apple`}
        >
          {t('navigate_apple')}
        </Menu.Item>
        <Menu.Item
          component="a"
          href={links.waze}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testId}-waze`}
        >
          {t('navigate_waze')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
