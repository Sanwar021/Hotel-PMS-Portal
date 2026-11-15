import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8095',
      '/health': 'http://localhost:8095',
      '/ws': {
        target: 'ws://localhost:8095',
        ws: true,
      },
    },
  },
})
