-- AgentHub user-center schema migration (PostgreSQL)
--
-- Purpose:
--   1. Collapse staff accounts into the four-role model: user, admin, superadmin.
--   2. Add normalized creator-submission permissions and reviewer metadata.
--   3. Add creator-facing aggregate counters on agents.
--
-- This migration is intentionally additive except for role-value normalization.
-- Membership columns are retained as unused legacy columns until the deployed
-- Payload collection configuration no longer references them.
-- Run once, after the application release that understands this schema.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Four-role model
-- ---------------------------------------------------------------------------
-- Existing roles are mapped as follows:
-- system_admin/content_admin/reviewer/user_admin/admin -> admin
-- paid_user/user -> user
-- superadmin -> superadmin
CREATE TYPE "public"."enum_users_role_v2" AS ENUM ('superadmin', 'admin', 'user');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "public"."enum_users_role_v2"
  USING (
    CASE "role"::text
      WHEN 'superadmin' THEN 'superadmin'
      WHEN 'system_admin' THEN 'admin'
      WHEN 'content_admin' THEN 'admin'
      WHEN 'reviewer' THEN 'admin'
      WHEN 'user_admin' THEN 'admin'
      WHEN 'admin' THEN 'admin'
      ELSE 'user'
    END
  )::"public"."enum_users_role_v2";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
DROP TYPE "public"."enum_users_role";
ALTER TYPE "public"."enum_users_role_v2" RENAME TO "enum_users_role";

-- Payload keeps a version table in existing installations. Keep its role
-- snapshot compatible when the table is present.
DO $$
BEGIN
  IF to_regclass('public._users_v') IS NOT NULL THEN
    CREATE TYPE "public"."enum__users_v_version_role_v2" AS ENUM ('superadmin', 'admin', 'user');
    ALTER TABLE "_users_v" ALTER COLUMN "version_role" DROP DEFAULT;
    ALTER TABLE "_users_v"
      ALTER COLUMN "version_role" TYPE "public"."enum__users_v_version_role_v2"
      USING (
        CASE "version_role"::text
          WHEN 'superadmin' THEN 'superadmin'
          WHEN 'system_admin' THEN 'admin'
          WHEN 'content_admin' THEN 'admin'
          WHEN 'reviewer' THEN 'admin'
          WHEN 'user_admin' THEN 'admin'
          WHEN 'admin' THEN 'admin'
          ELSE 'user'
        END
      )::"public"."enum__users_v_version_role_v2";
    ALTER TABLE "_users_v" ALTER COLUMN "version_role" SET DEFAULT 'user';
    DROP TYPE "public"."enum__users_v_version_role";
    ALTER TYPE "public"."enum__users_v_version_role_v2" RENAME TO "enum__users_v_version_role";
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Normalized creator submission permission (one current record per user)
-- ---------------------------------------------------------------------------
CREATE TYPE "public"."enum_skill_submission_permissions_status"
  AS ENUM ('active', 'revoked', 'expired');

CREATE TABLE "skill_submission_permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "status" "enum_skill_submission_permissions_status" DEFAULT 'active' NOT NULL,
  "expires_at" timestamp(3) with time zone NOT NULL,
  "granted_by_id" integer,
  "granted_from_request_id" integer,
  "revoked_at" timestamp(3) with time zone,
  "revoke_reason" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "skill_submission_permissions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT,
  CONSTRAINT "skill_submission_permissions_granted_by_id_users_id_fk"
    FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL,
  CONSTRAINT "skill_submission_permissions_request_id_skill_upload_requests_id_fk"
    FOREIGN KEY ("granted_from_request_id") REFERENCES "public"."skill_upload_requests"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "skill_submission_permissions_user_idx"
  ON "skill_submission_permissions" USING btree ("user_id");
CREATE INDEX "skill_submission_permissions_status_expires_at_idx"
  ON "skill_submission_permissions" USING btree ("status", "expires_at");

-- Backfill the new source of truth from the previous user-level permission.
INSERT INTO "skill_submission_permissions" (
  "user_id", "status", "expires_at", "granted_from_request_id", "created_at", "updated_at"
)
SELECT
  u."id",
  CASE WHEN u."disabled" THEN 'revoked'::"enum_skill_submission_permissions_status"
       ELSE 'active'::"enum_skill_submission_permissions_status" END,
  u."skill_submission_permission_expires_at",
  (
    SELECT r."id"
    FROM "skill_upload_requests" r
    WHERE r."requester_id" = u."id" AND r."status" = 'approved'
    ORDER BY r."updated_at" DESC, r."id" DESC
    LIMIT 1
  ),
  now(),
  now()
FROM "users" u
WHERE u."can_submit_skills" = true
  AND u."skill_submission_permission_expires_at" > now()
ON CONFLICT ("user_id") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Reviewer metadata: visible to the submitting user in My Skills
-- ---------------------------------------------------------------------------
ALTER TABLE "skill_upload_requests"
  ADD COLUMN IF NOT EXISTS "reviewer_id" integer,
  ADD COLUMN IF NOT EXISTS "review_note" varchar,
  ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp(3) with time zone;

ALTER TABLE "skill_submissions"
  ADD COLUMN IF NOT EXISTS "reviewer_id" integer,
  ADD COLUMN IF NOT EXISTS "review_note" varchar,
  ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp(3) with time zone;

ALTER TABLE "skill_upload_requests"
  ADD CONSTRAINT "skill_upload_requests_reviewer_id_users_id_fk"
  FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
ALTER TABLE "skill_submissions"
  ADD CONSTRAINT "skill_submissions_reviewer_id_users_id_fk"
  FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

CREATE INDEX "skill_upload_requests_requester_status_idx"
  ON "skill_upload_requests" USING btree ("requester_id", "status", "updated_at" DESC);
CREATE INDEX "skill_submissions_owner_status_idx"
  ON "skill_submissions" USING btree ("owner_id", "review_status", "updated_at" DESC);

-- Only one open permission request per user. Historical approved/rejected
-- requests remain available for audit.
CREATE UNIQUE INDEX "skill_upload_requests_one_pending_per_user_idx"
  ON "skill_upload_requests" USING btree ("requester_id")
  WHERE "status" = 'pending';

-- ---------------------------------------------------------------------------
-- 4. Creator metrics. Source of truth remains favorites/download_records;
--    these counters are read-only caches maintained in the same transaction.
-- ---------------------------------------------------------------------------
ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "favorite_count" numeric DEFAULT 0 NOT NULL;

UPDATE "agents" a
SET "favorite_count" = counts.total
FROM (
  SELECT "agent_id", count(*)::numeric AS total
  FROM "favorites"
  GROUP BY "agent_id"
) counts
WHERE counts."agent_id" = a."id";

CREATE INDEX "agents_owner_status_idx"
  ON "agents" USING btree ("owner_id", "status", "published_at" DESC);
CREATE INDEX "agents_featured_published_idx"
  ON "agents" USING btree ("featured", "published_at" DESC)
  WHERE "status" = 'published';

COMMIT;

-- After the application code has switched to skill_submission_permissions,
-- run the following cleanup in a separate release. Do NOT run it beforehand.
--
-- ALTER TABLE "users" DROP COLUMN "can_submit_skills";
-- ALTER TABLE "users" DROP COLUMN "skill_submission_permission_expires_at";
-- ALTER TABLE "users" DROP COLUMN "membership_status";
-- ALTER TABLE "users" DROP COLUMN "membership_expires_at";
-- ALTER TABLE "users" DROP COLUMN "plan";
