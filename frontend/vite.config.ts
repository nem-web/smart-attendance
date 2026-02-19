import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import type { Plugin } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Smart Attendance',
        short_name: 'Attendance',
        description: 'AI-powered attendance management system',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/smart-attendance-api[^/]*\.onrender\.com\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: './dist/stats.html'
    }) as Plugin
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
        target: 'https://smart-attendance-api-i87a.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      },
      '/static': {
        target: 'https://smart-attendance-api-i87a.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'query-vendor': ['@tanstack/react-query', 'axios'],
          'chart-vendor': ['recharts'],
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
