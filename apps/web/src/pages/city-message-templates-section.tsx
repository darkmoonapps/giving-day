import {
  Group,
  NativeSelect,
  Paper,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import {
  templateKeySchema,
  type Locale,
  type TemplateKey,
} from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
  SEMANTIC_COLORS,
} from '@giving-day/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getListCityMessageTemplatesQueryKey,
  useListCityMessageTemplates,
  useResetCityMessageTemplate,
  useUpsertCityMessageTemplate,
  type MessageTemplateResponseDto,
} from '../api/generated/api';
import {
  draftFromTemplate,
  draftsEqual,
  filterTemplatesByLocale,
  isMessageTemplateValidationKey,
  parseMessageTemplateDraft,
  templateLabelKey,
  type MessageTemplateDraft,
  type MessageTemplateFieldErrors,
} from '../cities/message-templates-form';

interface CityMessageTemplatesSectionProps {
  cityId: string;
}

function validationMessage(t: TFunction<'validation'>, key: string): string {
  return t(isMessageTemplateValidationKey(key) ? key : 'required');
}

function fieldError(
  tValidation: TFunction<'validation'>,
  errors: MessageTemplateFieldErrors,
  key: keyof MessageTemplateFieldErrors
): string | undefined {
  const message = errors[key];
  return message === undefined
    ? undefined
    : validationMessage(tValidation, message);
}

function inputValue(
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
): string {
  return event.currentTarget.value;
}

function templateIdentity(template: MessageTemplateResponseDto): string {
  return `${template.key}:${template.locale}`;
}

function toTemplateKey(key: MessageTemplateResponseDto['key']): TemplateKey {
  return templateKeySchema.parse(key);
}

interface TemplateEditorCardProps {
  cityId: string;
  template: MessageTemplateResponseDto;
}

function TemplateEditorCard({
  cityId,
  template,
}: TemplateEditorCardProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { t: tValidation } = useTranslation('validation');
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MessageTemplateDraft>(() =>
    draftFromTemplate(template)
  );
  const [errors, setErrors] = useState<MessageTemplateFieldErrors>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(draftFromTemplate(template));
    setErrors({});
    setSaved(false);
  }, [template]);

  const upsertMutation = useUpsertCityMessageTemplate({
    mutation: {
      onSuccess: async () => {
        setSaved(true);
        setErrors({});
        await queryClient.invalidateQueries({
          queryKey: getListCityMessageTemplatesQueryKey(cityId),
        });
      },
    },
  });

  const resetMutation = useResetCityMessageTemplate({
    mutation: {
      onSuccess: async () => {
        setSaved(false);
        setErrors({});
        await queryClient.invalidateQueries({
          queryKey: getListCityMessageTemplatesQueryKey(cityId),
        });
      },
    },
  });

  const dirty = !draftsEqual(draft, draftFromTemplate(template));
  const placeholdersHint = template.placeholders
    .map((placeholder) => `{{${placeholder}}}`)
    .join(', ');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSaved(false);
    const parsed = parseMessageTemplateDraft(draft);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    upsertMutation.mutate({
      cityId,
      key: template.key,
      locale: template.locale,
      data: parsed.data,
    });
  };

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      component="article"
      data-testid={`message-template-${template.key}-${template.locale}`}
    >
      <form noValidate onSubmit={handleSubmit}>
        <Stack gap="sm">
          <div>
            <AppTitle order={3}>
              {t(templateLabelKey(toTemplateKey(template.key)))}
            </AppTitle>
            <AppText c="dimmed" size="sm" mt="xs">
              {template.isCustom
                ? t('template_custom_badge')
                : t('template_default_badge')}
            </AppText>
            <AppText
              size="sm"
              mt="xs"
              data-testid={`template-placeholders-${template.key}`}
            >
              {`${t('template_placeholders_label')}: ${placeholdersHint}`}
            </AppText>
          </div>

          {saved ? (
            <AppAlert
              color={SEMANTIC_COLORS.success}
              data-testid={`message-template-success-${template.key}`}
            >
              {t('template_save_success')}
            </AppAlert>
          ) : null}
          {upsertMutation.isError ? (
            <AppAlert color="red" data-testid="message-template-save-error">
              {t('template_save_error')}
            </AppAlert>
          ) : null}
          {resetMutation.isError ? (
            <AppAlert color="red" data-testid="message-template-reset-error">
              {t('template_reset_error')}
            </AppAlert>
          ) : null}

          <TextInput
            name="title"
            label={t('template_title')}
            description={t('template_default_hint', {
              value: template.defaultTitle,
            })}
            value={draft.title}
            onChange={(event) => {
              const nextTitle = inputValue(event);
              setSaved(false);
              setDraft((current) => ({
                ...current,
                title: nextTitle,
              }));
            }}
            error={fieldError(tValidation, errors, 'title')}
            required
            withAsterisk
            dir={template.locale === 'he' ? 'rtl' : 'ltr'}
          />
          <Textarea
            name="body"
            label={t('template_body')}
            description={t('template_default_hint', {
              value: template.defaultBody,
            })}
            value={draft.body}
            minRows={3}
            onChange={(event) => {
              const nextBody = inputValue(event);
              setSaved(false);
              setDraft((current) => ({
                ...current,
                body: nextBody,
              }));
            }}
            error={fieldError(tValidation, errors, 'body')}
            required
            withAsterisk
            dir={template.locale === 'he' ? 'rtl' : 'ltr'}
          />

          <Group gap="sm">
            <AppButton
              type="submit"
              data-testid={`save-message-template-${template.key}`}
              loading={upsertMutation.isPending}
              disabled={!dirty && !upsertMutation.isPending}
            >
              {upsertMutation.isPending
                ? t('template_saving')
                : t('template_save')}
            </AppButton>
            {template.isCustom ? (
              <AppButton
                type="button"
                variant="light"
                data-testid={`reset-message-template-${template.key}`}
                loading={resetMutation.isPending}
                onClick={() => {
                  resetMutation.mutate({
                    cityId,
                    key: template.key,
                    locale: template.locale,
                  });
                }}
              >
                {t('template_reset')}
              </AppButton>
            ) : null}
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}

export function CityMessageTemplatesSection({
  cityId,
}: CityMessageTemplatesSectionProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const [locale, setLocale] = useState<Locale>('he');

  const templatesQuery = useListCityMessageTemplates(cityId);

  const templates =
    templatesQuery.data === undefined
      ? []
      : filterTemplatesByLocale(templatesQuery.data.templates, locale);

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      component="section"
      data-testid="city-message-templates"
    >
      <Stack gap="md">
        <div>
          <AppTitle order={2}>{t('settings_section_templates')}</AppTitle>
          <AppText c="dimmed" mt="xs">
            {t('templates_subtitle')}
          </AppText>
        </div>

        <NativeSelect
          name="templateLocale"
          label={t('template_locale')}
          data={[
            { value: 'he', label: tCommon('language.he') },
            { value: 'en', label: tCommon('language.en') },
          ]}
          value={locale}
          onChange={(event) => {
            setLocale(inputValue(event) === 'en' ? 'en' : 'he');
          }}
          data-testid="message-template-locale"
        />

        {templatesQuery.isError ? (
          <AppAlert color="red" data-testid="city-message-templates-error">
            {t('templates_load_error')}
          </AppAlert>
        ) : templatesQuery.isLoading ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          templates.map((template) => (
            <TemplateEditorCard
              key={templateIdentity(template)}
              cityId={cityId}
              template={template}
            />
          ))
        )}
      </Stack>
    </Paper>
  );
}
