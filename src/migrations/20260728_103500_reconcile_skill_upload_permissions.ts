import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Revoke legacy grants that no longer have an approved upload-permission request. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "users" AS u
    SET "can_submit_skills" = EXISTS (
      SELECT 1
      FROM "skill_upload_requests" AS r
      WHERE r."requester_id" = u."id"
        AND r."status" = 'approved'
    );
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // The old one-way grant state cannot be reconstructed safely.
}
