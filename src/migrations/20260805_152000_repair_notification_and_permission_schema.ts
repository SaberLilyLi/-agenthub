import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The notifications and skill-submission-permissions collections shipped without
 * migrations, so their tables only ever existed on databases built with dev push.
 * Missing `payload_locked_documents_rels` columns also broke every admin edit view:
 * Payload's document lock lookup joins one column per registered collection, and
 * the resulting Postgres error is swallowed into a blank page.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_skill_submission_permissions_status" AS ENUM('active', 'revoked', 'expired');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_notifications_type" AS ENUM('permission_approved', 'permission_rejected', 'skill_approved', 'skill_rejected');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "skill_submission_permissions" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE restrict,
      "status" "public"."enum_skill_submission_permissions_status" DEFAULT 'active' NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "granted_by_id" integer REFERENCES "public"."users"("id") ON DELETE set null,
      "granted_from_request_id" integer REFERENCES "public"."skill_upload_requests"("id") ON DELETE set null,
      "revoked_at" timestamp(3) with time zone,
      "revoke_reason" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "skill_submission_permissions_user_idx" ON "skill_submission_permissions" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "skill_submission_permissions_status_expires_at_idx" ON "skill_submission_permissions" USING btree ("status", "expires_at");

    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
      "type" "public"."enum_notifications_type" NOT NULL,
      "title" varchar NOT NULL,
      "message" varchar NOT NULL,
      "link" varchar,
      "read_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id", "read_at", "created_at" DESC);

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "skill_submission_permissions_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "notifications_id" integer;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_skill_submission_permissions_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_skill_submission_permissions_fk" FOREIGN KEY ("skill_submission_permissions_id") REFERENCES "public"."skill_submission_permissions"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_notifications_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_notifications_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_skill_submission_permissions_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "notifications_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "skill_submission_permissions_id";

    DROP TABLE IF EXISTS "notifications";
    DROP TABLE IF EXISTS "skill_submission_permissions";
    DROP TYPE IF EXISTS "public"."enum_notifications_type";
    DROP TYPE IF EXISTS "public"."enum_skill_submission_permissions_status";
  `)
}
