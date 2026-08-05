import * as migration_20260723_014401_initial_agenthub_schema from './20260723_014401_initial_agenthub_schema';
import * as migration_20260723_113800_user_roles_and_memberships from './20260723_113800_user_roles_and_memberships';
import * as migration_20260727_100000_add_skill_submissions from './20260727_100000_add_skill_submissions';
import * as migration_20260727_101000_add_skill_upload_permissions from './20260727_101000_add_skill_upload_permissions';
import * as migration_20260728_103500_reconcile_skill_upload_permissions from './20260728_103500_reconcile_skill_upload_permissions';
import * as migration_20260728_111500_add_skill_permission_expiry from './20260728_111500_add_skill_permission_expiry';
import * as migration_20260728_114500_split_admin_roles from './20260728_114500_split_admin_roles';
import * as migration_20260728_115500_strengthen_download_audit from './20260728_115500_strengthen_download_audit';
import * as migration_20260728_153000_store_skill_submissions_in_cos from './20260728_153000_store_skill_submissions_in_cos';
import * as migration_20260728_172000_add_consistency_constraints from './20260728_172000_add_consistency_constraints';
import * as migration_20260728_173700_add_storage_cleanup_jobs from './20260728_173700_add_storage_cleanup_jobs';
import * as migration_20260803_183000_local_skill_submissions from './20260803_183000_local_skill_submissions';
import * as migration_20260805_152000_repair_notification_and_permission_schema from './20260805_152000_repair_notification_and_permission_schema';

export const migrations = [
  {
    up: migration_20260723_014401_initial_agenthub_schema.up,
    down: migration_20260723_014401_initial_agenthub_schema.down,
    name: '20260723_014401_initial_agenthub_schema',
  },
  {
    up: migration_20260723_113800_user_roles_and_memberships.up,
    down: migration_20260723_113800_user_roles_and_memberships.down,
    name: '20260723_113800_user_roles_and_memberships',
  },
  {
    up: migration_20260727_100000_add_skill_submissions.up,
    down: migration_20260727_100000_add_skill_submissions.down,
    name: '20260727_100000_add_skill_submissions',
  },
  {
    up: migration_20260727_101000_add_skill_upload_permissions.up,
    down: migration_20260727_101000_add_skill_upload_permissions.down,
    name: '20260727_101000_add_skill_upload_permissions',
  },
  {
    up: migration_20260728_103500_reconcile_skill_upload_permissions.up,
    down: migration_20260728_103500_reconcile_skill_upload_permissions.down,
    name: '20260728_103500_reconcile_skill_upload_permissions',
  },
  {
    up: migration_20260728_111500_add_skill_permission_expiry.up,
    down: migration_20260728_111500_add_skill_permission_expiry.down,
    name: '20260728_111500_add_skill_permission_expiry',
  },
  {
    up: migration_20260728_114500_split_admin_roles.up,
    down: migration_20260728_114500_split_admin_roles.down,
    name: '20260728_114500_split_admin_roles',
  },
  {
    up: migration_20260728_115500_strengthen_download_audit.up,
    down: migration_20260728_115500_strengthen_download_audit.down,
    name: '20260728_115500_strengthen_download_audit',
  },
  {
    up: migration_20260728_153000_store_skill_submissions_in_cos.up,
    down: migration_20260728_153000_store_skill_submissions_in_cos.down,
    name: '20260728_153000_store_skill_submissions_in_cos',
  },
  {
    up: migration_20260728_172000_add_consistency_constraints.up,
    down: migration_20260728_172000_add_consistency_constraints.down,
    name: '20260728_172000_add_consistency_constraints'
  },
  {
    up: migration_20260728_173700_add_storage_cleanup_jobs.up,
    down: migration_20260728_173700_add_storage_cleanup_jobs.down,
    name: '20260728_173700_add_storage_cleanup_jobs'
  },
  {
    up: migration_20260803_183000_local_skill_submissions.up,
    down: migration_20260803_183000_local_skill_submissions.down,
    name: '20260803_183000_local_skill_submissions'
  },
  {
    up: migration_20260805_152000_repair_notification_and_permission_schema.up,
    down: migration_20260805_152000_repair_notification_and_permission_schema.down,
    name: '20260805_152000_repair_notification_and_permission_schema'
  },
];
