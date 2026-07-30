import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_users_role_new" AS ENUM('superadmin', 'system_admin', 'content_admin', 'reviewer', 'user_admin', 'paid_user', 'user', 'admin');
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."enum_users_role_new" USING "role"::text::"public"."enum_users_role_new";
    UPDATE "users" SET "role" = 'system_admin' WHERE "role" = 'admin';
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
    DROP TYPE "public"."enum_users_role";
    ALTER TYPE "public"."enum_users_role_new" RENAME TO "enum_users_role";

    DO $$ BEGIN
      IF to_regclass('public._users_v') IS NOT NULL THEN
        CREATE TYPE "public"."enum__users_v_version_role_new" AS ENUM('superadmin', 'system_admin', 'content_admin', 'reviewer', 'user_admin', 'paid_user', 'user', 'admin');
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" DROP DEFAULT;
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" TYPE "public"."enum__users_v_version_role_new" USING "version_role"::text::"public"."enum__users_v_version_role_new";
        UPDATE "_users_v" SET "version_role" = 'system_admin' WHERE "version_role" = 'admin';
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" SET DEFAULT 'user';
        DROP TYPE "public"."enum__users_v_version_role";
        ALTER TYPE "public"."enum__users_v_version_role_new" RENAME TO "enum__users_v_version_role";
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "users" SET "role" = 'admin' WHERE "role" IN ('system_admin', 'content_admin', 'reviewer', 'user_admin');
    DO $$ BEGIN
      IF to_regclass('public._users_v') IS NOT NULL THEN
        UPDATE "_users_v" SET "version_role" = 'admin' WHERE "version_role" IN ('system_admin', 'content_admin', 'reviewer', 'user_admin');
      END IF;
    END $$;
  `)
}
