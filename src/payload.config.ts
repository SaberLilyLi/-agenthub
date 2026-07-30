import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'
import { zh } from '@payloadcms/translations/languages/zh'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Agents } from './collections/Agents'
import { AgentVersions } from './collections/AgentVersions'
import { Favorites } from './collections/Favorites'
import { DownloadRecords } from './collections/DownloadRecords'
import { SkillSubmissions } from './collections/SkillSubmissions'
import { SkillUploadRequests } from './collections/SkillUploadRequests'
import { SiteSettings } from './globals/SiteSettings'
import { deleteRejectedSkillArchiveTask } from './jobs/deleteRejectedSkillArchive'
import { requiredDatabaseConnection, requiredSecret } from './lib/serverEnv'

const dirname = path.dirname(fileURLToPath(import.meta.url))
export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    components: { actions: ['@/components/admin/AdminActions#AdminActions'] },
  },
  cookiePrefix: 'agenthub-admin',
  i18n: { fallbackLanguage: 'zh', supportedLanguages: { zh } },
  // Never use a built-in fallback here: this key signs every Payload session.
  secret: requiredSecret('PAYLOAD_SECRET', 32),
  // Schema changes must be represented by migrations. Disabling development
  // push prevents tests and local startup from interactively mutating the DB.
  db: postgresAdapter({ pool: { connectionString: requiredDatabaseConnection() }, push: false }),
  sharp,
  // `admins` was a legacy auth collection. Keeping it registered would expose
  // a second identity source to Payload's REST and auth endpoints.
  collections: [Users, Media, Categories, Agents, AgentVersions, Favorites, DownloadRecords, SkillSubmissions, SkillUploadRequests],
  globals: [SiteSettings],
  jobs: {
    tasks: [deleteRejectedSkillArchiveTask],
    autoRun: process.env.NODE_ENV === 'test' ? [] : [
      {
        cron: '0 * * * * *',
        queue: 'storage-cleanup',
        limit: 10,
        disableScheduling: true,
      },
    ],
    deleteJobOnComplete: true,
  },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
