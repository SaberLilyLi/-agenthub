import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "skill_submissions_slug_idx";

    ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "owner_id" integer;
    ALTER TABLE "skill_submissions" ADD COLUMN IF NOT EXISTS "agent_id" integer;
    ALTER TABLE "agent_versions" ADD COLUMN IF NOT EXISTS "package_id" integer;

    ALTER TABLE "agents"
      ADD CONSTRAINT "agents_owner_id_users_id_fk"
      FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "skill_submissions"
      ADD CONSTRAINT "skill_submissions_agent_id_agents_id_fk"
      FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "agent_versions"
      ADD CONSTRAINT "agent_versions_package_id_skill_submissions_id_fk"
      FOREIGN KEY ("package_id") REFERENCES "public"."skill_submissions"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX "agents_owner_idx" ON "agents" USING btree ("owner_id");
    CREATE INDEX "skill_submissions_agent_idx" ON "skill_submissions" USING btree ("agent_id");
    CREATE INDEX "agent_versions_package_idx" ON "agent_versions" USING btree ("package_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "agent_versions_package_idx";
    DROP INDEX IF EXISTS "skill_submissions_agent_idx";
    DROP INDEX IF EXISTS "agents_owner_idx";

    ALTER TABLE "agent_versions" DROP CONSTRAINT IF EXISTS "agent_versions_package_id_skill_submissions_id_fk";
    ALTER TABLE "skill_submissions" DROP CONSTRAINT IF EXISTS "skill_submissions_agent_id_agents_id_fk";
    ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "agents_owner_id_users_id_fk";

    ALTER TABLE "agent_versions" DROP COLUMN IF EXISTS "package_id";
    ALTER TABLE "skill_submissions" DROP COLUMN IF EXISTS "agent_id";
    ALTER TABLE "agents" DROP COLUMN IF EXISTS "owner_id";

    CREATE UNIQUE INDEX "skill_submissions_slug_idx" ON "skill_submissions" USING btree ("slug");
  `)
}
