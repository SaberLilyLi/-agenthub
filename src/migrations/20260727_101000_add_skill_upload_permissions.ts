import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_skill_upload_requests_status" AS ENUM('pending', 'approved', 'rejected');
    ALTER TABLE "users" ADD COLUMN "can_submit_skills" boolean DEFAULT false;
    CREATE TABLE "skill_upload_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "requester_id" integer NOT NULL,
      "reason" varchar,
      "status" "enum_skill_upload_requests_status" DEFAULT 'pending' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "skill_upload_requests" ADD CONSTRAINT "skill_upload_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    CREATE INDEX "skill_upload_requests_requester_idx" ON "skill_upload_requests" USING btree ("requester_id");
    CREATE INDEX "skill_upload_requests_updated_at_idx" ON "skill_upload_requests" USING btree ("updated_at");
    CREATE INDEX "skill_upload_requests_created_at_idx" ON "skill_upload_requests" USING btree ("created_at");
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "skill_submissions_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "skill_upload_requests_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_skill_submissions_fk" FOREIGN KEY ("skill_submissions_id") REFERENCES "public"."skill_submissions"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_skill_upload_requests_fk" FOREIGN KEY ("skill_upload_requests_id") REFERENCES "public"."skill_upload_requests"("id") ON DELETE cascade ON UPDATE no action;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "skill_submissions_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "skill_upload_requests_id";
    DROP TABLE "skill_upload_requests";
    ALTER TABLE "users" DROP COLUMN "can_submit_skills";
    DROP TYPE "public"."enum_skill_upload_requests_status";
  `)
}
