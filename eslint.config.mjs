import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

export default [
  ...nextVitals,
  ...nextTypeScript,
  { ignores: ['.next/**', 'media/**', 'src/payload-types.ts', 'src/app/(payload)/admin/importMap.js'] },
  { rules: { '@typescript-eslint/no-explicit-any': 'warn', '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] } },
]
