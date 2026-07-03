import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          const normalizedId = id.replace(/\\/g, '/')

          if (/\/node_modules\/firebase\/(app|auth|firestore|storage|database|functions|analytics)/.test(normalizedId)) {
            const match = normalizedId.match(/\/node_modules\/firebase\/([^\/]+)/)
            return match ? `firebase-${match[1]}` : 'firebase-vendor'
          }
          if (/\/node_modules\/(leaflet|react-leaflet|react-leaflet-draw|leaflet-draw)(\/|$)/.test(normalizedId)) {
            return 'leaflet-vendor'
          }
          if (/\/node_modules\/(react|react-dom|react-router-dom)(\/|$)/.test(normalizedId)) {
            return 'react-vendor'
          }
          return undefined
        },
      },
    },
  },
})
