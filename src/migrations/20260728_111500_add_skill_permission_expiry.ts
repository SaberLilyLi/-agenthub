import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN "skill_submission_permission_expires_at" timestamp(3) with time zone;

    UPDATE "users" AS u
    SET
      "can_submit_skills" = true,
      "skill_submission_permission_expires_at" = now() + interval '180 days'
    WHERE u."disabled" = false
      AND EXISTS (
        SELECT 1
        FROM "skill_upload_requests" AS r
        WHERE r."requester_id" = u."id"
          AND r."status" = 'approved'
      );

    UPDATE "users"
    SET
      "can_submit_skills" = false,
      "skill_submission_permission_expires_at" = NULL
    WHERE "disabled" = true
       OR NOT EXISTS (
         SELECT 1
         FROM "skill_upload_requests" AS r
         WHERE r."requester_id" = "users"."id"
           AND r."status" = 'approved'
       );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN "skill_submission_permission_expires_at";
  `)
}
