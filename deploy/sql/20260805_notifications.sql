BEGIN;
CREATE TYPE "public"."enum_notifications_type" AS ENUM ('permission_approved', 'permission_rejected', 'skill_approved', 'skill_rejected');
CREATE TABLE "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "type" "enum_notifications_type" NOT NULL,
  "title" varchar NOT NULL,
  "message" varchar NOT NULL,
  "link" varchar,
  "read_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" ("user_id", "read_at", "created_at" DESC);
COMMIT;
