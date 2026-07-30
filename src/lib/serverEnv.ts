import { readFileSync } from 'node:fs'

const placeholderPattern = /^(?:change-me|replace-with|your[_-]?|development-only|example|test)(?:\b|[-_])/i

function valueFromFile(name: string, file: string) {
  try {
    return readFileSync(file, 'utf8').trim()
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    throw new Error(`${name}_FILE could not be read: ${reason}`)
  }
}

/** Reads a secret from the environment or a Docker/Kubernetes secret mount. */
export function requiredSecret(name: string, minimumLength = 1) {
  const file = process.env[`${name}_FILE`]
  const value = (file ? valueFromFile(name, file) : process.env[name])?.trim()

  if (!value) throw new Error(`${name} must be configured`)
  if (value.length < minimumLength) throw new Error(`${name} must be at least ${minimumLength} characters`)
  if (placeholderPattern.test(value)) throw new Error(`${name} must not use an example or development placeholder`)

  return value
}

export function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} must be configured`)
  return value
}

export function requiredDatabaseConnection() {
  const value = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim()
  if (!value) throw new Error('DATABASE_URI or DATABASE_URL must be configured')
  return value
}
