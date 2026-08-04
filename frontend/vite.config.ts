import {defineConfig, Plugin} from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, join, basename } from 'path'
import { existsSync, createReadStream, statSync } from 'fs'
import { homedir } from 'os'

/**
 * Vite plugin to serve /local-image/ files from GridoStudio Media directory.
 * In Wails dev mode, the frontend runs on Vite dev server and requests to
 * /local-image/ don't reach the Go asset handler. This plugin bridges that gap.
 */
function localImagePlugin(): Plugin {
  // Resolve the Media directory path (same logic as Go's GetAppDir + "Media")
  const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
  const mediaDir = join(appData, 'GridoStudio', 'Media')

  return {
    name: 'local-image-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/local-image/')) {
          return next()
        }
        const filename = basename(req.url.replace('/local-image/', ''))
        const filePath = join(mediaDir, filename)

        if (!existsSync(filePath)) {
          res.statusCode = 404
          res.end('Image not found')
          return
        }

        const stat = statSync(filePath)
        const ext = filename.split('.').pop()?.toLowerCase()
        const mimeMap: Record<string, string> = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          webp: 'image/webp',
          gif: 'image/gif',
        }

        res.setHeader('Content-Type', mimeMap[ext || ''] || 'application/octet-stream')
        res.setHeader('Content-Length', stat.size)
        res.setHeader('Cache-Control', 'no-cache')
        createReadStream(filePath).pipe(res)
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localImagePlugin()],
  worker: {
    format: 'es'
  },
  define: {
    'process.env': {},
    global: 'globalThis'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('konva') || id.includes('react-konva')) {
              return 'vendor-konva';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@radix-ui') || id.includes('framer-motion')) {
              return 'vendor-ui';
            }
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('@mediapipe') || id.includes('@tensorflow')) {
              return 'vendor-ai';
            }
          }
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@techstark/opencv-js'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    // Headers removed to allow local asset fetching in Wails WebView without CORP errors
  }
})
