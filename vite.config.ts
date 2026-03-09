import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 允许外部访问
    port: 3000,
    proxy: {
      '/chat': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/agents': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/models': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
