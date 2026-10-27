-- Enable citext extension for case-insensitive email
CREATE EXTENSION IF NOT EXISTS citext;

-- Drop placeholder table
DROP TABLE IF EXISTS "_prisma_placeholder";

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('he', 'en');
CREATE TYPE "ThemePref" AS ENUM ('system', 'light', 'dark');
CREATE TYPE "AuthProvider" AS ENUM ('google', 'facebook', 'apple');
CREATE TYPE "CityRole" AS ENUM ('coordinator', 'volunteer');
CREATE TYPE "MembershipStatus" AS ENUM ('pending', 'active', 'paused', 'removed');
CREATE TYPE "ElderStatus" AS ENUM ('active', 'paused', 'hospitalized', 'moved', 'deceased', 'removed');
CREATE TYPE "GeocodeStatus" AS ENUM ('pending', 'ok', 'failed', 'manual');
CREATE TYPE "ContactRelation" AS ENUM ('child', 'spouse', 'sibling', 'caregiver', 'social_worker', 'neighbor', 'other');
CREATE TYPE "ChangeRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'superseded');
CREATE TYPE "MatchType" AS ENUM ('permanent', 'one_time');
CREATE TYPE "MatchEndReason" AS ENUM ('volunteer_left', 'elder_inactive', 'reassigned', 'other');
CREATE TYPE "DayStatus" AS ENUM ('draft', 'published', 'in_progress', 'closed', 'cancelled');
CREATE TYPE "ParticipationStatus" AS ENUM ('invited', 'confirmed', 'declined', 'cancelled', 'no_show', 'attended');
CREATE TYPE "DeliveryStatus" AS ENUM ('unassigned', 'assigned', 'picked', 'delivered', 'not_delivered', 'cancelled');
CREATE TYPE "NotDeliveredReason" AS ENUM ('not_home', 'refused', 'wrong_address', 'hospitalized', 'deceased', 'other');
CREATE TYPE "DeliveryResolution" AS ENUM ('redeliver', 'reassigned', 'skipped', 'follow_up');
CREATE TYPE "TemplateKey" AS ENUM ('day_invite', 'confirm_reminder', 'unpicked_warning', 'final_status_reminder', 'reassigned', 'change_request_reviewed', 'membership_approved');
CREATE TYPE "NotificationChannel" AS ENUM ('push');
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'failed', 'clicked');

-- CreateTable: City
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "archivedAt" TIMESTAMPTZ,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CitySettings
CREATE TABLE "city_settings" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID NOT NULL,
    "centerAddress" TEXT NOT NULL,
    "centerLat" DECIMAL(9,6) NOT NULL,
    "centerLng" DECIMAL(9,6) NOT NULL,
    "defaultStartTime" TIME NOT NULL,
    "defaultEndTime" TIME NOT NULL,
    "confirmReminderAfterHours" INTEGER NOT NULL DEFAULT 24,
    "unpickedPushMinutesBeforeEnd" INTEGER NOT NULL DEFAULT 60,
    "missingFinalStatusWaitHours" INTEGER NOT NULL DEFAULT 72,
    "defaultLocale" "Locale" NOT NULL DEFAULT 'he',
    "defaultTheme" TEXT NOT NULL DEFAULT 'wisteria-mint',
    "orgName" TEXT,
    "logoUrl" TEXT,
    "extra" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "city_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: User
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "archivedAt" TIMESTAMPTZ,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" CITEXT,
    "birthDate" DATE,
    "locale" "Locale" NOT NULL DEFAULT 'he',
    "themePref" "ThemePref" NOT NULL DEFAULT 'system',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "onboardedAt" TIMESTAMPTZ,
    "lastLoginAt" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuthIdentity
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerSubject" TEXT NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Session
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CityInvite
CREATE TABLE "city_invites" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID NOT NULL,
    "role" "CityRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMPTZ,

    CONSTRAINT "city_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CityMembership
CREATE TABLE "city_memberships" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CityRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'pending',
    "inviteId" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMPTZ,
    "homeArea" TEXT,
    "coordinatorNotes" TEXT,

    CONSTRAINT "city_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Elder
CREATE TABLE "elders" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "archivedAt" TIMESTAMPTZ,
    "cityId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "phoneAlt" TEXT,
    "language" TEXT NOT NULL DEFAULT 'he',
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "entrance" TEXT,
    "floor" TEXT,
    "apartment" TEXT,
    "buildingCode" TEXT,
    "addressNotes" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "geocodeStatus" "GeocodeStatus" NOT NULL DEFAULT 'pending',
    "status" "ElderStatus" NOT NULL DEFAULT 'active',
    "statusReason" TEXT,
    "notes" TEXT,

    CONSTRAINT "elders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ElderContact
CREATE TABLE "elder_contacts" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "elderId" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relation" "ContactRelation" NOT NULL,
    "phone" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "elder_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ElderChangeRequest
CREATE TABLE "elder_change_requests" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID NOT NULL,
    "elderId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" TEXT,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ,
    "reviewNote" TEXT,

    CONSTRAINT "elder_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Match
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID NOT NULL,
    "elderId" UUID NOT NULL,
    "volunteerId" UUID NOT NULL,
    "type" "MatchType" NOT NULL,
    "dayId" UUID,
    "startsAt" DATE NOT NULL,
    "endsAt" DATE,
    "endReason" "MatchEndReason",

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DistributionDay
CREATE TABLE "distribution_days" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "notesForVolunteers" TEXT,
    "internalNotes" TEXT,
    "addOns" TEXT[],
    "status" "DayStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMPTZ,
    "closedAt" TIMESTAMPTZ,
    "createdById" UUID NOT NULL,

    CONSTRAINT "distribution_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DayParticipation
CREATE TABLE "day_participations" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID NOT NULL,
    "dayId" UUID NOT NULL,
    "volunteerId" UUID NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'invited',
    "respondedAt" TIMESTAMPTZ,
    "cancelReason" TEXT,
    "finishedAt" TIMESTAMPTZ,

    CONSTRAINT "day_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Delivery
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID NOT NULL,
    "dayId" UUID NOT NULL,
    "elderId" UUID NOT NULL,
    "volunteerId" UUID,
    "matchId" UUID,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'unassigned',
    "notDeliveredReason" "NotDeliveredReason",
    "note" TEXT,
    "routeOrder" INTEGER,
    "assignedAt" TIMESTAMPTZ,
    "pickedAt" TIMESTAMPTZ,
    "finalAt" TIMESTAMPTZ,
    "resolution" "DeliveryResolution",
    "resolvedById" UUID,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DeliveryEvent
CREATE TABLE "delivery_events" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryId" UUID NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "fromVolunteerId" UUID,
    "toVolunteerId" UUID,
    "actorId" UUID NOT NULL,
    "note" TEXT,
    "at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MessageTemplate
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "cityId" UUID,
    "key" "TemplateKey" NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PushSubscription
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "lastSuccessAt" TIMESTAMPTZ,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "disabledAt" TIMESTAMPTZ,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NotificationLog
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "templateKey" "TemplateKey" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "dayId" UUID,
    "deliveryId" UUID,
    "dedupeKey" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cityId" UUID,
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "diff" JSONB NOT NULL,
    "at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");
CREATE UNIQUE INDEX "city_settings_cityId_key" ON "city_settings"("cityId");
CREATE UNIQUE INDEX "auth_identities_provider_providerSubject_key" ON "auth_identities"("provider", "providerSubject");
CREATE UNIQUE INDEX "city_invites_tokenHash_key" ON "city_invites"("tokenHash");
CREATE INDEX "city_invites_cityId_role_revokedAt_idx" ON "city_invites"("cityId", "role", "revokedAt");
CREATE UNIQUE INDEX "city_memberships_cityId_userId_key" ON "city_memberships"("cityId", "userId");
CREATE INDEX "city_memberships_cityId_role_status_idx" ON "city_memberships"("cityId", "role", "status");
CREATE INDEX "elders_cityId_status_idx" ON "elders"("cityId", "status");
CREATE INDEX "elder_contacts_cityId_idx" ON "elder_contacts"("cityId");
CREATE INDEX "elder_change_requests_cityId_status_idx" ON "elder_change_requests"("cityId", "status");
CREATE INDEX "matches_cityId_elderId_type_endsAt_idx" ON "matches"("cityId", "elderId", "type", "endsAt");
CREATE INDEX "matches_cityId_volunteerId_idx" ON "matches"("cityId", "volunteerId");
CREATE UNIQUE INDEX "distribution_days_cityId_date_key" ON "distribution_days"("cityId", "date");
CREATE INDEX "distribution_days_cityId_status_idx" ON "distribution_days"("cityId", "status");
CREATE UNIQUE INDEX "day_participations_dayId_volunteerId_key" ON "day_participations"("dayId", "volunteerId");
CREATE INDEX "day_participations_cityId_status_idx" ON "day_participations"("cityId", "status");
CREATE UNIQUE INDEX "deliveries_dayId_elderId_key" ON "deliveries"("dayId", "elderId");
CREATE INDEX "deliveries_dayId_volunteerId_idx" ON "deliveries"("dayId", "volunteerId");
CREATE INDEX "deliveries_dayId_status_idx" ON "deliveries"("dayId", "status");
CREATE INDEX "deliveries_cityId_idx" ON "deliveries"("cityId");
CREATE INDEX "delivery_events_deliveryId_idx" ON "delivery_events"("deliveryId");
CREATE UNIQUE INDEX "message_templates_cityId_key_locale_key" ON "message_templates"("cityId", "key", "locale");
CREATE INDEX "message_templates_cityId_idx" ON "message_templates"("cityId");
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
CREATE UNIQUE INDEX "notification_logs_dedupeKey_key" ON "notification_logs"("dedupeKey");
CREATE INDEX "notification_logs_cityId_userId_idx" ON "notification_logs"("cityId", "userId");
CREATE INDEX "audit_logs_cityId_entity_idx" ON "audit_logs"("cityId", "entity");
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "city_settings" ADD CONSTRAINT "city_settings_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "city_invites" ADD CONSTRAINT "city_invites_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "city_invites" ADD CONSTRAINT "city_invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "city_memberships" ADD CONSTRAINT "city_memberships_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "city_memberships" ADD CONSTRAINT "city_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "city_memberships" ADD CONSTRAINT "city_memberships_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "city_invites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "city_memberships" ADD CONSTRAINT "city_memberships_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "elders" ADD CONSTRAINT "elders_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "elder_contacts" ADD CONSTRAINT "elder_contacts_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "elders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "elder_contacts" ADD CONSTRAINT "elder_contacts_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "elder_change_requests" ADD CONSTRAINT "elder_change_requests_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "elder_change_requests" ADD CONSTRAINT "elder_change_requests_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "elders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "elder_change_requests" ADD CONSTRAINT "elder_change_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "elder_change_requests" ADD CONSTRAINT "elder_change_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "elders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "distribution_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "distribution_days" ADD CONSTRAINT "distribution_days_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "distribution_days" ADD CONSTRAINT "distribution_days_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "day_participations" ADD CONSTRAINT "day_participations_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "day_participations" ADD CONSTRAINT "day_participations_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "distribution_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "day_participations" ADD CONSTRAINT "day_participations_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "distribution_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "elders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
