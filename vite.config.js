import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const GATEWAY_URL = process.env.VITE_LOCAL_API_BASE_URL || process.env.VITE_API_BASE_URL || "http://localhost:8787"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: GATEWAY_URL,
        changeOrigin: true,
      },
    },
  },
})

