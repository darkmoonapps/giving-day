import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TEMPLATE_KEYS,
  defaultMessageCopyFor,
  findUnknownPlaceholders,
  localeSchema,
  messageTemplateSchema,
  messageTemplatesResponseSchema,
  placeholdersFor,
  templateKeySchema,
  upsertMessageTemplateSchema,
  type Locale,
  type MessageTemplate as MessageTemplateDto,
  type MessageTemplatesResponse,
  type TemplateKey,
} from '@giving-day/shared';
import type { MessageTemplate as PrismaMessageTemplate } from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanOnCity } from '../cities/city-access';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertMessageTemplateDto } from './dto/upsert-message-template.dto';

const LOCALES = localeSchema.options;

@Injectable()
export class MessageTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory
  ) {}

  async list(
    cityId: string,
    actor: UserWithMemberships
  ): Promise<MessageTemplatesResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'MessageTemplate', cityId);
    await this.requireCity(cityId);

    const cityRows = await this.prisma.messageTemplate.findMany({
      where: { cityId },
    });
    const globalRows = await this.prisma.messageTemplate.findMany({
      where: { cityId: null },
    });

    const cityByKeyLocale = new Map(
      cityRows.map((row) => [`${row.key}:${row.locale}`, row] as const)
    );
    const globalByKeyLocale = new Map(
      globalRows.map((row) => [`${row.key}:${row.locale}`, row] as const)
    );

    const templates: MessageTemplateDto[] = [];
    for (const key of TEMPLATE_KEYS) {
      for (const locale of LOCALES) {
        templates.push(
          this.toDto(
            key,
            locale,
            cityByKeyLocale.get(`${key}:${locale}`) ?? null,
            globalByKeyLocale.get(`${key}:${locale}`) ?? null
          )
        );
      }
    }

    return messageTemplatesResponseSchema.parse({ templates });
  }

  async upsert(
    cityId: string,
    keyParam: string,
    localeParam: string,
    dto: UpsertMessageTemplateDto,
    actor: UserWithMemberships
  ): Promise<MessageTemplateDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'update', 'MessageTemplate', cityId);
    await this.requireCity(cityId);

    const key = this.parseTemplateKey(keyParam);
    const locale = this.parseLocale(localeParam);
    const parsed = upsertMessageTemplateSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException('message_templates.invalid');
    }

    const unknownTitle = findUnknownPlaceholders(parsed.data.title, key);
    const unknownBody = findUnknownPlaceholders(parsed.data.body, key);
    if (unknownTitle.length > 0 || unknownBody.length > 0) {
      throw new BadRequestException('message_templates.unknown_placeholder');
    }

    const row = await this.prisma.messageTemplate.upsert({
      where: {
        cityId_key_locale: {
          cityId,
          key,
          locale,
        },
      },
      create: {
        cityId,
        key,
        locale,
        title: parsed.data.title,
        body: parsed.data.body,
      },
      update: {
        title: parsed.data.title,
        body: parsed.data.body,
      },
    });

    const global = await this.prisma.messageTemplate.findFirst({
      where: { cityId: null, key, locale },
    });

    return this.toDto(key, locale, row, global);
  }

  async reset(
    cityId: string,
    keyParam: string,
    localeParam: string,
    actor: UserWithMemberships
  ): Promise<MessageTemplateDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'delete', 'MessageTemplate', cityId);
    await this.requireCity(cityId);

    const key = this.parseTemplateKey(keyParam);
    const locale = this.parseLocale(localeParam);

    await this.prisma.messageTemplate.deleteMany({
      where: { cityId, key, locale },
    });

    const global = await this.prisma.messageTemplate.findFirst({
      where: { cityId: null, key, locale },
    });

    return this.toDto(key, locale, null, global);
  }

  private toDto(
    key: TemplateKey,
    locale: Locale,
    cityRow: PrismaMessageTemplate | null,
    globalRow: PrismaMessageTemplate | null
  ): MessageTemplateDto {
    const codeDefault = defaultMessageCopyFor(key, locale);
    const fallbackTitle = globalRow?.title ?? codeDefault.title;
    const fallbackBody = globalRow?.body ?? codeDefault.body;
    const isCustom = cityRow !== null;

    return messageTemplateSchema.parse({
      id: cityRow?.id ?? null,
      key,
      locale,
      title: cityRow?.title ?? fallbackTitle,
      body: cityRow?.body ?? fallbackBody,
      defaultTitle: fallbackTitle,
      defaultBody: fallbackBody,
      isCustom,
      placeholders: [...placeholdersFor(key)],
    });
  }

  private parseTemplateKey(value: string): TemplateKey {
    const parsed = templateKeySchema.safeParse(value);
    if (!parsed.success) {
      throw new NotFoundException('message_templates.not_found');
    }
    return parsed.data;
  }

  private parseLocale(value: string): Locale {
    const parsed = localeSchema.safeParse(value);
    if (!parsed.success) {
      throw new NotFoundException('message_templates.not_found');
    }
    return parsed.data;
  }

  private async requireCity(cityId: string): Promise<void> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, archivedAt: true },
    });
    if (!city || city.archivedAt !== null) {
      throw new NotFoundException('cities.not_found');
    }
  }
}
