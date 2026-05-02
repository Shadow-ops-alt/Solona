import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const bufferShim = path.resolve(
  dirname,
  '../../node_modules/vite-plugin-node-polyfills-vite8/shims/buffer/dist/index.js',
)
const processShim = path.resolve(
  dirname,
  '../../node_modules/vite-plugin-node-polyfills-vite8/shims/process/dist/index.js',
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      // Some deps import `buffer/` and `process/` with trailing slashes.
      // Point them directly at the shim entrypoints to bypass conditional exports.
      buffer: bufferShim,
      'buffer/': bufferShim,
      process: processShim,
      'process/': processShim,
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
})
