import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy real AI calls to the FastAPI service when it is running.
    // The dashboard works fully on MSW mocks without this.
    proxy: {
      '/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
