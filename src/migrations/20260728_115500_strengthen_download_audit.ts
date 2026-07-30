import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "download_records"
      ADD COLUMN "actor_type" varchar DEFAULT 'anonymous' NOT NULL,
      ADD COLUMN "request_id" varchar,
      ADD COLUMN "ip_hash_key_version" varchar,
      ADD COLUMN "user_agent" varchar;
    CREATE UNIQUE INDEX "download_records_request_id_idx" ON "download_records" USING btree ("request_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "download_records_request_id_idx";
    ALTER TABLE "download_records"
      DROP COLUMN "actor_type",
      DROP COLUMN "request_id",
      DROP COLUMN "ip_hash_key_version",
      DROP COLUMN "user_agent";
  `)
}
