export const MAX_SKILL_FILE_BYTES = 200 * 1024 * 1024

// Allow a small, bounded amount of multipart overhead and textual metadata.
export const MAX_SKILL_UPLOAD_REQUEST_BYTES = MAX_SKILL_FILE_BYTES + 1024 * 1024

export const MAX_SKILL_FILE_LABEL = '200 MB'
