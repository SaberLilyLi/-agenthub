import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX "favorites_user_agent_idx"
      ON "favorites" USING btree ("user_id", "agent_id");
    CREATE UNIQUE INDEX "agent_versions_agent_version_idx"
      ON "agent_versions" USING btree ("agent_id", "version");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "favorites_user_agent_idx";
    DROP INDEX IF EXISTS "agent_versions_agent_version_idx";
  `)
}
