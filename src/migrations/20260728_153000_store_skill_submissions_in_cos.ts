import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Replaces local Payload upload persistence with COS object metadata. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "skill_submissions" ADD COLUMN IF NOT EXISTS "storage_key" varchar;
    ALTER TABLE "skill_submissions" ADD COLUMN IF NOT EXISTS "file_name" varchar;
    ALTER TABLE "skill_submissions" ADD COLUMN IF NOT EXISTS "file_size" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "skill_submissions" DROP COLUMN IF EXISTS "storage_key";
    ALTER TABLE "skill_submissions" DROP COLUMN IF EXISTS "file_name";
    ALTER TABLE "skill_submissions" DROP COLUMN IF EXISTS "file_size";
  `)
}
