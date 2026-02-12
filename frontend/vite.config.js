import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // ← force automatic runtime
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://smart-attendance-api-i87a.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'https://smart-attendance-api-i87a.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
