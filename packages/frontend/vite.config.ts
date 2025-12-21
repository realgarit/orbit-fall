import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point to compiled JS instead of TypeScript source
      '@shared': path.resolve(__dirname, '../../packages/shared/dist'),
    },
  },
  server: {
    port: 5173,
  },
})
