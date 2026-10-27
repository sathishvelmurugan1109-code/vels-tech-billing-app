import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const isDevelopment = mode === 'development'
  const apiUrl = isDevelopment
    ? env.VITE_API_URL || 'http://localhost:5000'
    : process.env.VITE_API_URL || ''
  const masterAdminApiUrl = isDevelopment
    ? env.VITE_MASTER_ADMIN_API_URL || ''
    : process.env.VITE_MASTER_ADMIN_API_URL || ''

  return {
    define: {
      __VITE_API_URL__: JSON.stringify(apiUrl),
      __VITE_MASTER_ADMIN_API_URL__: JSON.stringify(masterAdminApiUrl),
      __VITE_IS_DEV__: JSON.stringify(isDevelopment),
    },
    plugins: [react()],
    server: {
      port: 5176,
    },
    build: {
      outDir: 'dist'
    }
  }
})
