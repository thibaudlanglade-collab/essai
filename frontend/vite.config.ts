import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "url";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Backend API
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Prospect activation link (/app/{token} → 302 with Set-Cookie)
      // Must be proxied so the cookie is posted on the same origin as the SPA.
      "/app": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Public expired page (HTML, no React)
      "/expired": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
