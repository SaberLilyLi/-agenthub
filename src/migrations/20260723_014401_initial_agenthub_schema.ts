import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_admins_role" AS ENUM('admin', 'superadmin');
  CREATE TYPE "public"."enum__admins_v_version_role" AS ENUM('admin', 'superadmin');
  CREATE TYPE "public"."enum_users_role" AS ENUM('user');
  CREATE TYPE "public"."enum__users_v_version_role" AS ENUM('user');
  CREATE TYPE "public"."enum_agents_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum__agents_v_version_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_agent_versions_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum_agent_versions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__agent_versions_v_version_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum__agent_versions_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "admins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_admins_role" DEFAULT 'admin',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "_admins_v_version_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "_admins_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_role" "enum__admins_v_version_role" DEFAULT 'admin',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_email" varchar NOT NULL,
  	"version_reset_password_token" varchar,
  	"version_reset_password_expiration" timestamp(3) with time zone,
  	"version_salt" varchar,
  	"version_hash" varchar,
  	"version_login_attempts" numeric DEFAULT 0,
  	"version_lock_until" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"avatar_id" integer,
  	"role" "enum_users_role" DEFAULT 'user',
  	"disabled" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "_users_v_version_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "_users_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_avatar_id" integer,
  	"version_role" "enum__users_v_version_role" DEFAULT 'user',
  	"version_disabled" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_email" varchar NOT NULL,
  	"version_reset_password_token" varchar,
  	"version_reset_password_expiration" timestamp(3) with time zone,
  	"version_salt" varchar,
  	"version_hash" varchar,
  	"version_login_attempts" numeric DEFAULT 0,
  	"version_lock_until" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
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
  
  CREATE TABLE "_media_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_alt" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"icon" varchar,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_categories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_description" varchar,
  	"version_icon" varchar,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "agents_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "agents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"description" varchar,
  	"category_id" integer NOT NULL,
  	"cover_id" integer,
  	"demo_url" varchar,
  	"featured" boolean DEFAULT false,
  	"status" "enum_agents_status" DEFAULT 'draft',
  	"published_at" timestamp(3) with time zone,
  	"download_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "agents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_agents_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_agents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_summary" varchar NOT NULL,
  	"version_description" varchar,
  	"version_category_id" integer NOT NULL,
  	"version_cover_id" integer,
  	"version_demo_url" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_status" "enum__agents_v_version_status" DEFAULT 'draft',
  	"version_published_at" timestamp(3) with time zone,
  	"version_download_count" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_agents_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "agent_versions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"agent_id" integer NOT NULL,
  	"version" varchar NOT NULL,
  	"file_size" varchar,
  	"changelog" varchar,
  	"download_url" varchar,
  	"channel" "enum_agent_versions_channel" DEFAULT 'stable',
  	"status" "enum_agent_versions_status" DEFAULT 'draft',
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_agent_versions_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_agent_id" integer NOT NULL,
  	"version_version" varchar NOT NULL,
  	"version_file_size" varchar,
  	"version_changelog" varchar,
  	"version_download_url" varchar,
  	"version_channel" "enum__agent_versions_v_version_channel" DEFAULT 'stable',
  	"version_status" "enum__agent_versions_v_version_status" DEFAULT 'draft',
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "favorites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"agent_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_favorites_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_user_id" integer NOT NULL,
  	"version_agent_id" integer NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "download_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer,
  	"agent_id" integer NOT NULL,
  	"version_id" integer NOT NULL,
  	"ip_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_download_records_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_user_id" integer,
  	"version_agent_id" integer NOT NULL,
  	"version_version_id" integer NOT NULL,
  	"version_ip_hash" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer,
  	"media_id" integer,
  	"categories_id" integer,
  	"agents_id" integer,
  	"agent_versions_id" integer,
  	"favorites_id" integer,
  	"download_records_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar DEFAULT '鲸创 AgentHub',
  	"description" varchar DEFAULT '智能体应用发现平台',
  	"contact_email" varchar,
  	"icp" varchar,
  	"police_record" varchar,
  	"about" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_site_name" varchar DEFAULT '鲸创 AgentHub',
  	"version_description" varchar DEFAULT '智能体应用发现平台',
  	"version_contact_email" varchar,
  	"version_icp" varchar,
  	"version_police_record" varchar,
  	"version_about" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admins_v_version_sessions" ADD CONSTRAINT "_admins_v_version_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_admins_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admins_v" ADD CONSTRAINT "_admins_v_parent_id_admins_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_users_v_version_sessions" ADD CONSTRAINT "_users_v_version_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_users_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v" ADD CONSTRAINT "_users_v_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_users_v" ADD CONSTRAINT "_users_v_version_avatar_id_media_id_fk" FOREIGN KEY ("version_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_parent_id_media_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agents_tags" ADD CONSTRAINT "agents_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agents" ADD CONSTRAINT "agents_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agents" ADD CONSTRAINT "agents_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agents_rels" ADD CONSTRAINT "agents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agents_rels" ADD CONSTRAINT "agents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_agents_v_version_tags" ADD CONSTRAINT "_agents_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_agents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_agents_v" ADD CONSTRAINT "_agents_v_parent_id_agents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agents_v" ADD CONSTRAINT "_agents_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agents_v" ADD CONSTRAINT "_agents_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agents_v_rels" ADD CONSTRAINT "_agents_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_agents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_agents_v_rels" ADD CONSTRAINT "_agents_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agent_versions_v" ADD CONSTRAINT "_agent_versions_v_parent_id_agent_versions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agent_versions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agent_versions_v" ADD CONSTRAINT "_agent_versions_v_version_agent_id_agents_id_fk" FOREIGN KEY ("version_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_favorites_v" ADD CONSTRAINT "_favorites_v_parent_id_favorites_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."favorites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_favorites_v" ADD CONSTRAINT "_favorites_v_version_user_id_users_id_fk" FOREIGN KEY ("version_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_favorites_v" ADD CONSTRAINT "_favorites_v_version_agent_id_agents_id_fk" FOREIGN KEY ("version_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "download_records" ADD CONSTRAINT "download_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "download_records" ADD CONSTRAINT "download_records_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "download_records" ADD CONSTRAINT "download_records_version_id_agent_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."agent_versions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_download_records_v" ADD CONSTRAINT "_download_records_v_parent_id_download_records_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."download_records"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_download_records_v" ADD CONSTRAINT "_download_records_v_version_user_id_users_id_fk" FOREIGN KEY ("version_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_download_records_v" ADD CONSTRAINT "_download_records_v_version_agent_id_agents_id_fk" FOREIGN KEY ("version_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_download_records_v" ADD CONSTRAINT "_download_records_v_version_version_id_agent_versions_id_fk" FOREIGN KEY ("version_version_id") REFERENCES "public"."agent_versions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agents_fk" FOREIGN KEY ("agents_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_versions_fk" FOREIGN KEY ("agent_versions_id") REFERENCES "public"."agent_versions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_favorites_fk" FOREIGN KEY ("favorites_id") REFERENCES "public"."favorites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_download_records_fk" FOREIGN KEY ("download_records_id") REFERENCES "public"."download_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE INDEX "_admins_v_version_sessions_order_idx" ON "_admins_v_version_sessions" USING btree ("_order");
  CREATE INDEX "_admins_v_version_sessions_parent_id_idx" ON "_admins_v_version_sessions" USING btree ("_parent_id");
  CREATE INDEX "_admins_v_parent_idx" ON "_admins_v" USING btree ("parent_id");
  CREATE INDEX "_admins_v_version_version_updated_at_idx" ON "_admins_v" USING btree ("version_updated_at");
  CREATE INDEX "_admins_v_version_version_created_at_idx" ON "_admins_v" USING btree ("version_created_at");
  CREATE INDEX "_admins_v_version_version_email_idx" ON "_admins_v" USING btree ("version_email");
  CREATE INDEX "_admins_v_created_at_idx" ON "_admins_v" USING btree ("created_at");
  CREATE INDEX "_admins_v_updated_at_idx" ON "_admins_v" USING btree ("updated_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "_users_v_version_sessions_order_idx" ON "_users_v_version_sessions" USING btree ("_order");
  CREATE INDEX "_users_v_version_sessions_parent_id_idx" ON "_users_v_version_sessions" USING btree ("_parent_id");
  CREATE INDEX "_users_v_parent_idx" ON "_users_v" USING btree ("parent_id");
  CREATE INDEX "_users_v_version_version_avatar_idx" ON "_users_v" USING btree ("version_avatar_id");
  CREATE INDEX "_users_v_version_version_updated_at_idx" ON "_users_v" USING btree ("version_updated_at");
  CREATE INDEX "_users_v_version_version_created_at_idx" ON "_users_v" USING btree ("version_created_at");
  CREATE INDEX "_users_v_version_version_email_idx" ON "_users_v" USING btree ("version_email");
  CREATE INDEX "_users_v_created_at_idx" ON "_users_v" USING btree ("created_at");
  CREATE INDEX "_users_v_updated_at_idx" ON "_users_v" USING btree ("updated_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "_media_v_parent_idx" ON "_media_v" USING btree ("parent_id");
  CREATE INDEX "_media_v_version_version_updated_at_idx" ON "_media_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_v_version_version_created_at_idx" ON "_media_v" USING btree ("version_created_at");
  CREATE INDEX "_media_v_version_version_filename_idx" ON "_media_v" USING btree ("version_filename");
  CREATE INDEX "_media_v_created_at_idx" ON "_media_v" USING btree ("created_at");
  CREATE INDEX "_media_v_updated_at_idx" ON "_media_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "_categories_v_parent_idx" ON "_categories_v" USING btree ("parent_id");
  CREATE INDEX "_categories_v_version_version_slug_idx" ON "_categories_v" USING btree ("version_slug");
  CREATE INDEX "_categories_v_version_version_updated_at_idx" ON "_categories_v" USING btree ("version_updated_at");
  CREATE INDEX "_categories_v_version_version_created_at_idx" ON "_categories_v" USING btree ("version_created_at");
  CREATE INDEX "_categories_v_created_at_idx" ON "_categories_v" USING btree ("created_at");
  CREATE INDEX "_categories_v_updated_at_idx" ON "_categories_v" USING btree ("updated_at");
  CREATE INDEX "agents_tags_order_idx" ON "agents_tags" USING btree ("_order");
  CREATE INDEX "agents_tags_parent_id_idx" ON "agents_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "agents_slug_idx" ON "agents" USING btree ("slug");
  CREATE INDEX "agents_category_idx" ON "agents" USING btree ("category_id");
  CREATE INDEX "agents_cover_idx" ON "agents" USING btree ("cover_id");
  CREATE INDEX "agents_updated_at_idx" ON "agents" USING btree ("updated_at");
  CREATE INDEX "agents_created_at_idx" ON "agents" USING btree ("created_at");
  CREATE INDEX "agents_rels_order_idx" ON "agents_rels" USING btree ("order");
  CREATE INDEX "agents_rels_parent_idx" ON "agents_rels" USING btree ("parent_id");
  CREATE INDEX "agents_rels_path_idx" ON "agents_rels" USING btree ("path");
  CREATE INDEX "agents_rels_media_id_idx" ON "agents_rels" USING btree ("media_id");
  CREATE INDEX "_agents_v_version_tags_order_idx" ON "_agents_v_version_tags" USING btree ("_order");
  CREATE INDEX "_agents_v_version_tags_parent_id_idx" ON "_agents_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_agents_v_parent_idx" ON "_agents_v" USING btree ("parent_id");
  CREATE INDEX "_agents_v_version_version_slug_idx" ON "_agents_v" USING btree ("version_slug");
  CREATE INDEX "_agents_v_version_version_category_idx" ON "_agents_v" USING btree ("version_category_id");
  CREATE INDEX "_agents_v_version_version_cover_idx" ON "_agents_v" USING btree ("version_cover_id");
  CREATE INDEX "_agents_v_version_version_updated_at_idx" ON "_agents_v" USING btree ("version_updated_at");
  CREATE INDEX "_agents_v_version_version_created_at_idx" ON "_agents_v" USING btree ("version_created_at");
  CREATE INDEX "_agents_v_created_at_idx" ON "_agents_v" USING btree ("created_at");
  CREATE INDEX "_agents_v_updated_at_idx" ON "_agents_v" USING btree ("updated_at");
  CREATE INDEX "_agents_v_rels_order_idx" ON "_agents_v_rels" USING btree ("order");
  CREATE INDEX "_agents_v_rels_parent_idx" ON "_agents_v_rels" USING btree ("parent_id");
  CREATE INDEX "_agents_v_rels_path_idx" ON "_agents_v_rels" USING btree ("path");
  CREATE INDEX "_agents_v_rels_media_id_idx" ON "_agents_v_rels" USING btree ("media_id");
  CREATE INDEX "agent_versions_agent_idx" ON "agent_versions" USING btree ("agent_id");
  CREATE INDEX "agent_versions_updated_at_idx" ON "agent_versions" USING btree ("updated_at");
  CREATE INDEX "agent_versions_created_at_idx" ON "agent_versions" USING btree ("created_at");
  CREATE INDEX "_agent_versions_v_parent_idx" ON "_agent_versions_v" USING btree ("parent_id");
  CREATE INDEX "_agent_versions_v_version_version_agent_idx" ON "_agent_versions_v" USING btree ("version_agent_id");
  CREATE INDEX "_agent_versions_v_version_version_updated_at_idx" ON "_agent_versions_v" USING btree ("version_updated_at");
  CREATE INDEX "_agent_versions_v_version_version_created_at_idx" ON "_agent_versions_v" USING btree ("version_created_at");
  CREATE INDEX "_agent_versions_v_created_at_idx" ON "_agent_versions_v" USING btree ("created_at");
  CREATE INDEX "_agent_versions_v_updated_at_idx" ON "_agent_versions_v" USING btree ("updated_at");
  CREATE INDEX "favorites_user_idx" ON "favorites" USING btree ("user_id");
  CREATE INDEX "favorites_agent_idx" ON "favorites" USING btree ("agent_id");
  CREATE INDEX "favorites_updated_at_idx" ON "favorites" USING btree ("updated_at");
  CREATE INDEX "favorites_created_at_idx" ON "favorites" USING btree ("created_at");
  CREATE INDEX "_favorites_v_parent_idx" ON "_favorites_v" USING btree ("parent_id");
  CREATE INDEX "_favorites_v_version_version_user_idx" ON "_favorites_v" USING btree ("version_user_id");
  CREATE INDEX "_favorites_v_version_version_agent_idx" ON "_favorites_v" USING btree ("version_agent_id");
  CREATE INDEX "_favorites_v_version_version_updated_at_idx" ON "_favorites_v" USING btree ("version_updated_at");
  CREATE INDEX "_favorites_v_version_version_created_at_idx" ON "_favorites_v" USING btree ("version_created_at");
  CREATE INDEX "_favorites_v_created_at_idx" ON "_favorites_v" USING btree ("created_at");
  CREATE INDEX "_favorites_v_updated_at_idx" ON "_favorites_v" USING btree ("updated_at");
  CREATE INDEX "download_records_user_idx" ON "download_records" USING btree ("user_id");
  CREATE INDEX "download_records_agent_idx" ON "download_records" USING btree ("agent_id");
  CREATE INDEX "download_records_version_idx" ON "download_records" USING btree ("version_id");
  CREATE INDEX "download_records_updated_at_idx" ON "download_records" USING btree ("updated_at");
  CREATE INDEX "download_records_created_at_idx" ON "download_records" USING btree ("created_at");
  CREATE INDEX "_download_records_v_parent_idx" ON "_download_records_v" USING btree ("parent_id");
  CREATE INDEX "_download_records_v_version_version_user_idx" ON "_download_records_v" USING btree ("version_user_id");
  CREATE INDEX "_download_records_v_version_version_agent_idx" ON "_download_records_v" USING btree ("version_agent_id");
  CREATE INDEX "_download_records_v_version_version_version_idx" ON "_download_records_v" USING btree ("version_version_id");
  CREATE INDEX "_download_records_v_version_version_updated_at_idx" ON "_download_records_v" USING btree ("version_updated_at");
  CREATE INDEX "_download_records_v_version_version_created_at_idx" ON "_download_records_v" USING btree ("version_created_at");
  CREATE INDEX "_download_records_v_created_at_idx" ON "_download_records_v" USING btree ("created_at");
  CREATE INDEX "_download_records_v_updated_at_idx" ON "_download_records_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_agents_id_idx" ON "payload_locked_documents_rels" USING btree ("agents_id");
  CREATE INDEX "payload_locked_documents_rels_agent_versions_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_versions_id");
  CREATE INDEX "payload_locked_documents_rels_favorites_id_idx" ON "payload_locked_documents_rels" USING btree ("favorites_id");
  CREATE INDEX "payload_locked_documents_rels_download_records_id_idx" ON "payload_locked_documents_rels" USING btree ("download_records_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "_admins_v_version_sessions" CASCADE;
  DROP TABLE "_admins_v" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "_users_v_version_sessions" CASCADE;
  DROP TABLE "_users_v" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "_media_v" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "_categories_v" CASCADE;
  DROP TABLE "agents_tags" CASCADE;
  DROP TABLE "agents" CASCADE;
  DROP TABLE "agents_rels" CASCADE;
  DROP TABLE "_agents_v_version_tags" CASCADE;
  DROP TABLE "_agents_v" CASCADE;
  DROP TABLE "_agents_v_rels" CASCADE;
  DROP TABLE "agent_versions" CASCADE;
  DROP TABLE "_agent_versions_v" CASCADE;
  DROP TABLE "favorites" CASCADE;
  DROP TABLE "_favorites_v" CASCADE;
  DROP TABLE "download_records" CASCADE;
  DROP TABLE "_download_records_v" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "_site_settings_v" CASCADE;
  DROP TYPE "public"."enum_admins_role";
  DROP TYPE "public"."enum__admins_v_version_role";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum__users_v_version_role";
  DROP TYPE "public"."enum_agents_status";
  DROP TYPE "public"."enum__agents_v_version_status";
  DROP TYPE "public"."enum_agent_versions_channel";
  DROP TYPE "public"."enum_agent_versions_status";
  DROP TYPE "public"."enum__agent_versions_v_version_channel";
  DROP TYPE "public"."enum__agent_versions_v_version_status";`)
}
