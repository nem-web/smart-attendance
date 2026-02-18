import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  optimizeDeps: {
    include: ['html5-qrcode']
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Exclude e2e tests from vitest
    exclude: ['e2e/**/*', 'node_modules/**/*'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        secure: false,
      }
    }
  }
})
