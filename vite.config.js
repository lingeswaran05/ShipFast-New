import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const GATEWAY_URL = process.env.VITE_LOCAL_API_BASE_URL || "http://localhost:8088"

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
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/auth': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/v1/roles': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/roles': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/v1/shipments': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/public': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/admin': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/operations': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/notifications': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/support': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
      '/api/reports': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
    },
  },
})

