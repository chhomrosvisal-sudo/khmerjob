import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { authFormAlias } from './config/auth-form-alias.js'

const proxyTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-router-dom', 'lucide-react'] },
  server: {
    host: 'localhost', port: 5173, strictPort: true,
    proxy: Object.fromEntries(['/api', '/docs', '/openapi.json'].map(path => [path, { target: proxyTarget, changeOrigin: true }])),
  },
  preview: { proxy: Object.fromEntries(['/api', '/docs', '/openapi.json'].map(path => [path, { target: proxyTarget, changeOrigin: true }])) },
  resolve: { alias: {
    ...authFormAlias,
    '@smart-home-power-chart': fileURLToPath(new URL(existsSync(new URL('./node_modules/recharts/package.json', import.meta.url))
      ? './src/smart-home/components/RechartsPowerChart.jsx'
      : './src/smart-home/components/SvgPowerChart.jsx', import.meta.url)),
  } },
})
