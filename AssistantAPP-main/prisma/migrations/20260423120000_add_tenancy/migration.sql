-- Sprint 0.5 · D-023 — Multi-tenancy foundation
--
-- Strategy: additive-only (per Golden Rule #4 and C-004 audit).
-- Two-phase deploy when Supabase lands:
--   Phase 1 (this migration): create Tenant + TenantContract tables,
--     add nullable tenantId columns everywhere, backfill LVJ tenant.
--   Phase 2 (separate migration 20260424*_tenantid_not_null):
--     ALTER COLUMN ... SET NOT NULL after every row has a tenantId.
-- Splitting the NOT NULL promotion into a second migration lets us
-- deploy phase 1 ahead of a full backfill job in production.
--
-- The LVJ seed row uses a deterministic cuid so the application can
-- reference it via env var (SEED_LVJ_TENANT_ID) in sandbox-without-DB
-- tests. Do NOT reuse this id across environments.

-- ────────────────────────────────────────────────
-- 1. Tenant core
-- ────────────────────────────────────────────────

CREATE TABLE "Tenant" (
  "id"                   TEXT        PRIMARY KEY,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  "slug"                 TEXT        NOT NULL UNIQUE,
  "displayName"          TEXT        NOT NULL,
  "jurisdiction"         TEXT        NOT NULL,
  "defaultLocale"        TEXT        NOT NULL DEFAULT 'en',
  "status"               TEXT        NOT NULL DEFAULT 'ACTIVE',
  "marketingHitlEnabled" BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX "Tenant_status_idx" ON "Tenant" ("status");

CREATE TABLE "TenantContract" (
  "id"                TEXT         PRIMARY KEY,
  "tenantId"          TEXT         NOT NULL UNIQUE REFERENCES "Tenant"("id"),
  "version"           TEXT         NOT NULL,
  "acceptedVersion"   TEXT,
  "acceptedAt"        TIMESTAMP(3),
  "acceptedByUserId"  TEXT,
  "commissionPct"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "freeTierExpiresAt" TIMESTAMP(3),
  "stripeAccountId"   TEXT         UNIQUE,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL
);

-- ────────────────────────────────────────────────
-- 2. Seed the LVJ tenant (single-tenant today)
-- ────────────────────────────────────────────────

INSERT INTO "Tenant" ("id", "updatedAt", "slug", "displayName", "jurisdiction", "defaultLocale", "status")
VALUES (
  'tenant_lvj_seed_0001',
  CURRENT_TIMESTAMP,
  'lvj',
  'LVJ Immigration',
  'US',
  'en',
  'ACTIVE'
);

INSERT INTO "TenantContract" ("id", "tenantId", "version", "commissionPct", "updatedAt")
VALUES (
  'tc_lvj_seed_0001',
  'tenant_lvj_seed_0001',
  '1.0',
  0,
  CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────
-- 3. Add nullable tenantId to every business table.
--    Backfill to LVJ. NOT NULL promotion lands in a
--    follow-up migration once production data is fully
--    backfilled.
-- ────────────────────────────────────────────────

-- User
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
-- Backfill: every non-LVJ_* user belongs to LVJ; LVJ_* stay NULL
-- (platform-staff bypass).
UPDATE "User"
SET "tenantId" = 'tenant_lvj_seed_0001'
WHERE "role" NOT IN ('ADMIN', 'LVJ_ADMIN', 'LVJ_TEAM', 'LVJ_MARKETING');
CREATE INDEX "User_tenantId_idx" ON "User" ("tenantId");

-- ServiceType
ALTER TABLE "ServiceType" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "ServiceType" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "ServiceType_tenantId_idx" ON "ServiceType" ("tenantId");

-- Case
ALTER TABLE "Case" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "Case" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "Case_tenantId_idx" ON "Case" ("tenantId");
CREATE INDEX "Case_tenantId_overallStatus_idx" ON "Case" ("tenantId", "overallStatus");

-- Office
ALTER TABLE "Office" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "Office" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "Office_tenantId_idx" ON "Office" ("tenantId");

-- Partner
ALTER TABLE "Partner" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "Partner" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "Partner_tenantId_idx" ON "Partner" ("tenantId");

-- CaseOutcome
ALTER TABLE "CaseOutcome" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "CaseOutcome" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "CaseOutcome_tenantId_idx" ON "CaseOutcome" ("tenantId");

-- EligibilityLead
ALTER TABLE "EligibilityLead" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "EligibilityLead" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "EligibilityLead_tenantId_idx" ON "EligibilityLead" ("tenantId");
CREATE INDEX "EligibilityLead_tenantId_status_idx" ON "EligibilityLead" ("tenantId", "status");

-- NotificationLog (nullable — platform alerts may be tenant-less)
ALTER TABLE "NotificationLog" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "NotificationLog" SET "tenantId" = 'tenant_lvj_seed_0001'
WHERE "caseId" IS NOT NULL OR "userId" IS NOT NULL;
CREATE INDEX "NotificationLog_tenantId_idx" ON "NotificationLog" ("tenantId");

-- VoiceCallLog (nullable)
ALTER TABLE "VoiceCallLog" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "VoiceCallLog" SET "tenantId" = 'tenant_lvj_seed_0001'
WHERE "caseId" IS NOT NULL OR "userId" IS NOT NULL;
CREATE INDEX "VoiceCallLog_tenantId_idx" ON "VoiceCallLog" ("tenantId");

-- AuditLog (nullable)
ALTER TABLE "AuditLog" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "AuditLog" SET "tenantId" = 'tenant_lvj_seed_0001'
WHERE "caseId" IS NOT NULL OR "userId" IS NOT NULL;
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog" ("tenantId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog" ("action", "createdAt");

-- AutomationLog (nullable)
ALTER TABLE "AutomationLog" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "AutomationLog" SET "tenantId" = 'tenant_lvj_seed_0001'
WHERE "caseId" IS NOT NULL OR "leadId" IS NOT NULL;
CREATE INDEX "AutomationLog_tenantId_createdAt_idx" ON "AutomationLog" ("tenantId", "createdAt");

-- AgentDraft
ALTER TABLE "AgentDraft" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "AgentDraft" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "AgentDraft_tenantId_reviewState_idx" ON "AgentDraft" ("tenantId", "reviewState");

-- HITLApproval
ALTER TABLE "HITLApproval" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "HITLApproval" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "HITLApproval_tenantId_status_slaDueAt_idx" ON "HITLApproval" ("tenantId", "status", "slaDueAt");

-- CaseDeadline
ALTER TABLE "CaseDeadline" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "CaseDeadline" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "CaseDeadline_tenantId_dueAt_status_idx" ON "CaseDeadline" ("tenantId", "dueAt", "status");

-- ExternalPartner
ALTER TABLE "ExternalPartner" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "ExternalPartner" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "ExternalPartner_tenantId_idx" ON "ExternalPartner" ("tenantId");

-- ExternalCommunication
ALTER TABLE "ExternalCommunication" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "ExternalCommunication" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "ExternalCommunication_tenantId_idx" ON "ExternalCommunication" ("tenantId");

-- Document
ALTER TABLE "Document" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "Document" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "Document_tenantId_idx" ON "Document" ("tenantId");

-- Payment
ALTER TABLE "Payment" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "Payment" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "Payment_tenantId_idx" ON "Payment" ("tenantId");

-- TimelineEvent
ALTER TABLE "TimelineEvent" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "TimelineEvent" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "TimelineEvent_tenantId_idx" ON "TimelineEvent" ("tenantId");

-- Message
ALTER TABLE "Message" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id");
UPDATE "Message" SET "tenantId" = 'tenant_lvj_seed_0001';
CREATE INDEX "Message_tenantId_idx" ON "Message" ("tenantId");

-- ────────────────────────────────────────────────
-- 4. Promote to NOT NULL where the schema requires it.
--
-- The backfill above is unconditional for single-tenant rows, so every
-- row now has a tenantId. In a future cross-tenant deploy this block
-- will move into a separate follow-up migration that runs only after
-- a production backfill job has completed (see file header).
--
-- Columns that remain NULLABLE by design (User, NotificationLog,
-- VoiceCallLog, AuditLog, AutomationLog) are omitted.
-- ────────────────────────────────────────────────

ALTER TABLE "ServiceType"           ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Case"                  ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Office"                ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Partner"               ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CaseOutcome"           ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "EligibilityLead"       ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AgentDraft"            ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "HITLApproval"          ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CaseDeadline"          ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ExternalPartner"       ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ExternalCommunication" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Document"              ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Payment"               ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TimelineEvent"         ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Message"               ALTER COLUMN "tenantId" SET NOT NULL;
