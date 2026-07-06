import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    target: 'esnext'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    // Headers removed to allow local asset fetching in Wails WebView without CORP errors
  }
})
