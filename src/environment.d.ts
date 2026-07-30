declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET?: string
      PAYLOAD_SECRET_FILE?: string
      DATABASE_URI?: string
      DATABASE_URL?: string
      NEXT_PUBLIC_SERVER_URL?: string
      VERCEL_PROJECT_PRODUCTION_URL?: string
      TENCENT_SECRET_ID?: string
      TENCENT_SECRET_ID_FILE?: string
      TENCENT_SECRET_KEY?: string
      TENCENT_SECRET_KEY_FILE?: string
      TRUST_PROXY?: string
      AUDIT_IP_HASH_SECRET?: string
      AUDIT_IP_HASH_SECRET_FILE?: string
      AUDIT_IP_HASH_KEY_VERSION?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
