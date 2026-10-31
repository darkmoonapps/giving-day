import { Group, Paper, Stack, TextInput } from '@mantine/core';
import type { CityRole } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getListCityJoinLinksQueryKey,
  useListCityJoinLinks,
  useRegenerateCityJoinLink,
  type CityJoinLinkStatusDto,
} from '../api/generated/api';
import {
  JOIN_LINK_ROLES,
  clearRevealedJoinLink,
  copyText,
  formatJoinLinkCreatedAt,
  joinLinkForRole,
  readRevealedJoinLink,
  revealedJoinLinkMatchesStatus,
  visibleJoinLinkUrl,
  writeRevealedJoinLink,
  type RevealedJoinLink,
} from '../cities/city-join-links';
import { useLanguage } from '../i18n/use-language';

const ROLE_LABEL_KEY = {
  volunteer: 'role_volunteer',
  coordinator: 'role_coordinator',
} as const;

interface CityJoinLinksSectionProps {
  cityId: string;
}

interface JoinLinkRoleCardProps {
  role: CityRole;
  status: CityJoinLinkStatusDto | undefined;
  revealed: RevealedJoinLink | null;
  confirming: boolean;
  regenerating: boolean;
  regenerateFailed: boolean;
  copied: boolean;
  onCopy: (role: CityRole, url: string) => void;
  onAskRegenerate: (role: CityRole) => void;
  onCancelRegenerate: () => void;
  onConfirmRegenerate: (role: CityRole) => void;
}

function JoinLinkRoleCard({
  role,
  status,
  revealed,
  confirming,
  regenerating,
  regenerateFailed,
  copied,
  onCopy,
  onAskRegenerate,
  onCancelRegenerate,
  onConfirmRegenerate,
}: JoinLinkRoleCardProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { language } = useLanguage();
  const active = status?.active === true;
  const url = visibleJoinLinkUrl(revealed, status);
  const createdAt = status?.createdAt ?? null;

  return (
    <Stack gap="sm" data-testid={`join-link-${role}`}>
      <AppTitle order={3}>{t(ROLE_LABEL_KEY[role])}</AppTitle>
      <AppText>
        {active ? t('join_link_active') : t('join_link_inactive')}
      </AppText>
      {active ? (
        <AppText c="dimmed" size="sm">
          {t('join_link_used_count', { count: status?.usedCount ?? 0 })}
        </AppText>
      ) : null}
      {active && createdAt !== null ? (
        <AppText c="dimmed" size="sm">
          {t('join_link_created', {
            date: formatJoinLinkCreatedAt(createdAt, language),
          })}
        </AppText>
      ) : null}
      {url !== null ? (
        <TextInput
          readOnly
          dir="ltr"
          label={t('join_link_url_label')}
          value={url}
          data-testid={`join-link-url-${role}`}
        />
      ) : (
        <AppText c="dimmed" size="sm">
          {active ? t('join_link_url_hidden') : t('join_link_create_hint')}
        </AppText>
      )}
      {copied ? (
        <AppAlert color="teal" data-testid={`join-link-copied-${role}`}>
          {t('join_link_copied')}
        </AppAlert>
      ) : null}
      {regenerateFailed ? (
        <AppAlert
          color="red"
          data-testid={`join-link-regenerate-error-${role}`}
        >
          {t('join_link_regenerate_error')}
        </AppAlert>
      ) : null}
      {confirming ? (
        <Stack gap="sm">
          <AppText size="sm">{t('join_link_regenerate_confirm')}</AppText>
          <Group gap="sm">
            <AppButton
              size="sm"
              data-testid={`confirm-regenerate-join-link-${role}`}
              loading={regenerating}
              onClick={() => {
                onConfirmRegenerate(role);
              }}
            >
              {t('confirm_regenerate_join_link')}
            </AppButton>
            <AppButton
              size="sm"
              variant="light"
              data-testid={`cancel-regenerate-join-link-${role}`}
              disabled={regenerating}
              onClick={onCancelRegenerate}
            >
              {t('cancel_regenerate_join_link')}
            </AppButton>
          </Group>
        </Stack>
      ) : (
        <Group gap="sm">
          {url !== null ? (
            <AppButton
              size="sm"
              variant="light"
              data-testid={`copy-join-link-${role}`}
              onClick={() => {
                onCopy(role, url);
              }}
            >
              {t('join_link_copy')}
            </AppButton>
          ) : null}
          <AppButton
            size="sm"
            variant={active ? 'light' : 'filled'}
            data-testid={
              active
                ? `regenerate-join-link-${role}`
                : `create-join-link-${role}`
            }
            loading={regenerating}
            onClick={() => {
              if (active) {
                onAskRegenerate(role);
                return;
              }
              onConfirmRegenerate(role);
            }}
          >
            {active ? t('join_link_regenerate') : t('join_link_create')}
          </AppButton>
        </Group>
      )}
    </Stack>
  );
}

export function CityJoinLinksSection({
  cityId,
}: CityJoinLinksSectionProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<
    Record<CityRole, RevealedJoinLink | null>
  >(() => ({
    volunteer: readRevealedJoinLink(cityId, 'volunteer'),
    coordinator: readRevealedJoinLink(cityId, 'coordinator'),
  }));
  const [confirmingRole, setConfirmingRole] = useState<CityRole | null>(null);
  const [copiedRole, setCopiedRole] = useState<CityRole | null>(null);
  const [failedRole, setFailedRole] = useState<CityRole | null>(null);

  const linksQuery = useListCityJoinLinks(cityId);
  const regenerateMutation = useRegenerateCityJoinLink({
    mutation: {
      onSuccess: async (created) => {
        const next: RevealedJoinLink = {
          url: created.url,
          createdAt: created.createdAt,
        };
        writeRevealedJoinLink(cityId, created.role, next);
        setRevealed((current) => ({
          ...current,
          [created.role]: next,
        }));
        setConfirmingRole(null);
        setFailedRole(null);
        await queryClient.invalidateQueries({
          queryKey: getListCityJoinLinksQueryKey(cityId),
        });
      },
      onError: (
        _error: unknown,
        variables: { cityId: string; role: CityRole }
      ) => {
        setFailedRole(variables.role);
      },
    },
  });

  useEffect(() => {
    setRevealed({
      volunteer: readRevealedJoinLink(cityId, 'volunteer'),
      coordinator: readRevealedJoinLink(cityId, 'coordinator'),
    });
    setConfirmingRole(null);
    setCopiedRole(null);
    setFailedRole(null);
  }, [cityId]);

  useEffect(() => {
    const links = linksQuery.data?.links;
    if (links === undefined) {
      return;
    }

    setRevealed((current) => {
      const next = { ...current };
      let changed = false;
      for (const role of JOIN_LINK_ROLES) {
        const status = joinLinkForRole(links, role);
        if (revealedJoinLinkMatchesStatus(current[role], status)) {
          continue;
        }
        if (next[role] !== null) {
          next[role] = null;
          changed = true;
        }
      }
      return changed ? next : current;
    });

    for (const role of JOIN_LINK_ROLES) {
      const status = joinLinkForRole(links, role);
      if (
        !revealedJoinLinkMatchesStatus(
          readRevealedJoinLink(cityId, role),
          status
        )
      ) {
        clearRevealedJoinLink(cityId, role);
      }
    }
  }, [cityId, linksQuery.data]);

  const handleCopy = (role: CityRole, url: string): void => {
    void copyText(url).then((ok) => {
      setCopiedRole(ok ? role : null);
    });
  };

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      component="section"
      data-testid="city-join-links"
    >
      <Stack gap="md">
        <div>
          <AppTitle order={2}>{t('settings_section_join_links')}</AppTitle>
          <AppText c="dimmed" mt="xs">
            {t('join_links_subtitle')}
          </AppText>
        </div>
        {linksQuery.isError ? (
          <AppAlert color="red" data-testid="city-join-links-error">
            {t('join_link_load_error')}
          </AppAlert>
        ) : linksQuery.isLoading ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          JOIN_LINK_ROLES.map((role) => (
            <JoinLinkRoleCard
              key={role}
              role={role}
              status={joinLinkForRole(linksQuery.data?.links, role)}
              revealed={revealed[role]}
              confirming={confirmingRole === role}
              regenerating={
                regenerateMutation.isPending &&
                regenerateMutation.variables?.role === role
              }
              regenerateFailed={failedRole === role}
              copied={copiedRole === role}
              onCopy={handleCopy}
              onAskRegenerate={setConfirmingRole}
              onCancelRegenerate={() => {
                setConfirmingRole(null);
              }}
              onConfirmRegenerate={(nextRole) => {
                setFailedRole(null);
                regenerateMutation.mutate({ cityId, role: nextRole });
              }}
            />
          ))
        )}
      </Stack>
    </Paper>
  );
}
