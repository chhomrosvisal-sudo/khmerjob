import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { authFormAlias } from './config/auth-form-alias.js'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: {
    ...authFormAlias,
    '@smart-home-power-chart': fileURLToPath(new URL(existsSync(new URL('./node_modules/recharts/package.json', import.meta.url))
      ? './src/smart-home/components/RechartsPowerChart.jsx'
      : './src/smart-home/components/SvgPowerChart.jsx', import.meta.url)),
  } },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.jsx'],
    setupFiles: ['./tests/setup.js'],
  },
})
