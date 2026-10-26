import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    define: {
      __VITE_API_URL__: JSON.stringify(env.VITE_API_URL || ''),
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
