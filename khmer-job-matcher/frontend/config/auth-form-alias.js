import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const authFormAlias = {
  '@auth-form': fileURLToPath(new URL(
    existsSync(new URL('../node_modules/react-hook-form/package.json', import.meta.url)) && existsSync(new URL('../node_modules/zod/package.json', import.meta.url))
      ? '../src/hooks/useRHFZodAuthForm.js' : '../src/hooks/useNativeAuthForm.js', import.meta.url)),
}
