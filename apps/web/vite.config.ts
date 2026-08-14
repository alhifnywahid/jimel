import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Saat dev, teruskan REST + WS ke Worker (wrangler dev di :8787).
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
      "/ws": { target: "http://127.0.0.1:8787", changeOrigin: true, ws: true },
    },
  },
});
