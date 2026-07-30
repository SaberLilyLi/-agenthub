import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_skill_submissions_review_status" AS ENUM('pending', 'approved', 'rejected');
    CREATE TABLE "skill_submissions_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );
    CREATE TABLE "skill_submissions" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "name" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "summary" varchar NOT NULL,
      "description" varchar,
      "category_id" integer NOT NULL,
      "version" varchar NOT NULL,
      "changelog" varchar,
      "review_status" "enum_skill_submissions_review_status" DEFAULT 'pending' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );
    ALTER TABLE "skill_submissions_tags" ADD CONSTRAINT "skill_submissions_tags_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."skill_submissions"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "skill_submissions" ADD CONSTRAINT "skill_submissions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    ALTER TABLE "skill_submissions" ADD CONSTRAINT "skill_submissions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
    CREATE INDEX "skill_submissions_tags_order_idx" ON "skill_submissions_tags" USING btree ("_order");
    CREATE INDEX "skill_submissions_tags_parent_id_idx" ON "skill_submissions_tags" USING btree ("_parent_id");
    CREATE UNIQUE INDEX "skill_submissions_slug_idx" ON "skill_submissions" USING btree ("slug");
    CREATE INDEX "skill_submissions_owner_idx" ON "skill_submissions" USING btree ("owner_id");
    CREATE INDEX "skill_submissions_category_idx" ON "skill_submissions" USING btree ("category_id");
    CREATE INDEX "skill_submissions_updated_at_idx" ON "skill_submissions" USING btree ("updated_at");
    CREATE INDEX "skill_submissions_created_at_idx" ON "skill_submissions" USING btree ("created_at");
    CREATE UNIQUE INDEX "skill_submissions_filename_idx" ON "skill_submissions" USING btree ("filename");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "skill_submissions_tags";
    DROP TABLE "skill_submissions";
    DROP TYPE "public"."enum_skill_submissions_review_status";
  `)
}
