import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api/v1/auth': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/api/v1/shipments': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/public': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      '/api/operations': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/notifications': {
        target: 'http://localhost:8086',
        changeOrigin: true,
      },
      '/api/support': {
        target: 'http://localhost:8086',
        changeOrigin: true,
      },
      '/api/reports': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },
    },
  },
})

