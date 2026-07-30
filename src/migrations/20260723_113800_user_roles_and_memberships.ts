import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Consolidates the active identity model on `users`. The former `admins`
 * tables are deliberately retained as a read-only legacy source so this
 * migration does not discard login history or Payload's internal relations.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_users_role_new" AS ENUM('superadmin', 'admin', 'paid_user', 'user');
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE "enum_users_role_new" USING "role"::text::"enum_users_role_new";
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
    DROP TYPE "public"."enum_users_role";
    ALTER TYPE "public"."enum_users_role_new" RENAME TO "enum_users_role";

    DO $$ BEGIN
      IF to_regclass('public._users_v') IS NOT NULL THEN
        CREATE TYPE "public"."enum__users_v_version_role_new" AS ENUM('superadmin', 'admin', 'paid_user', 'user');
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" DROP DEFAULT;
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" TYPE "enum__users_v_version_role_new" USING "version_role"::text::"enum__users_v_version_role_new";
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" SET DEFAULT 'user';
        DROP TYPE "public"."enum__users_v_version_role";
        ALTER TYPE "public"."enum__users_v_version_role_new" RENAME TO "enum__users_v_version_role";
      END IF;
    END $$;

    CREATE TYPE "public"."enum_users_membership_status" AS ENUM('free', 'active', 'expired', 'cancelled');
    CREATE TYPE "public"."enum_users_plan" AS ENUM('monthly', 'yearly', 'lifetime');
    ALTER TABLE "users" ADD COLUMN "membership_status" "enum_users_membership_status" DEFAULT 'free';
    ALTER TABLE "users" ADD COLUMN "membership_expires_at" timestamp(3) with time zone;
    ALTER TABLE "users" ADD COLUMN "plan" "enum_users_plan";

    DO $$ BEGIN
      IF to_regclass('public._users_v') IS NOT NULL THEN
        CREATE TYPE "public"."enum__users_v_version_membership_status" AS ENUM('free', 'active', 'expired', 'cancelled');
        CREATE TYPE "public"."enum__users_v_version_plan" AS ENUM('monthly', 'yearly', 'lifetime');
        ALTER TABLE "_users_v" ADD COLUMN "version_membership_status" "enum__users_v_version_membership_status" DEFAULT 'free';
        ALTER TABLE "_users_v" ADD COLUMN "version_membership_expires_at" timestamp(3) with time zone;
        ALTER TABLE "_users_v" ADD COLUMN "version_plan" "enum__users_v_version_plan";
      END IF;
    END $$;

    INSERT INTO "users" (
      "name", "role", "disabled", "membership_status", "updated_at", "created_at",
      "email", "reset_password_token", "reset_password_expiration", "salt", "hash", "login_attempts", "lock_until"
    )
    SELECT
      "name", "role"::text::"enum_users_role", false, 'free', "updated_at", "created_at",
      "email", "reset_password_token", "reset_password_expiration", "salt", "hash", "login_attempts", "lock_until"
    FROM "admins"
    WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "users"."email" = "admins"."email");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN "membership_status";
    ALTER TABLE "users" DROP COLUMN "membership_expires_at";
    ALTER TABLE "users" DROP COLUMN "plan";
    DO $$ BEGIN
      IF to_regclass('public._users_v') IS NOT NULL THEN
        ALTER TABLE "_users_v" DROP COLUMN "version_membership_status";
        ALTER TABLE "_users_v" DROP COLUMN "version_membership_expires_at";
        ALTER TABLE "_users_v" DROP COLUMN "version_plan";
      END IF;
    END $$;
    DROP TYPE "public"."enum_users_membership_status";
    DROP TYPE "public"."enum_users_plan";
    DROP TYPE IF EXISTS "public"."enum__users_v_version_membership_status";
    DROP TYPE IF EXISTS "public"."enum__users_v_version_plan";

    CREATE TYPE "public"."enum_users_role_old" AS ENUM('user');
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE "enum_users_role_old" USING 'user'::"enum_users_role_old";
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
    DROP TYPE "public"."enum_users_role";
    ALTER TYPE "public"."enum_users_role_old" RENAME TO "enum_users_role";

    DO $$ BEGIN
      IF to_regclass('public._users_v') IS NOT NULL THEN
        CREATE TYPE "public"."enum__users_v_version_role_old" AS ENUM('user');
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" DROP DEFAULT;
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" TYPE "enum__users_v_version_role_old" USING 'user'::"enum__users_v_version_role_old";
        ALTER TABLE "_users_v" ALTER COLUMN "version_role" SET DEFAULT 'user';
        DROP TYPE "public"."enum__users_v_version_role";
        ALTER TYPE "public"."enum__users_v_version_role_old" RENAME TO "enum__users_v_version_role";
      END IF;
    END $$;
  `)
}
