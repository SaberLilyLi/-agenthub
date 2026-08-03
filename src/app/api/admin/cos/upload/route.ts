// Backward-compatible endpoint. Uploads are persisted locally; COS is not used.
export const runtime = 'nodejs'
export { POST } from '../../skills/upload/route'
