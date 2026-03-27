import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Force listen on all interfaces
    port: 5173,
    strictPort: true, // Fail if port is in use
  }
})
