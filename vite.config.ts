import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Path aliases
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Dependency optimization
  optimizeDeps: {
    exclude: ["lucide-react"],
  },

  // Remove console.log and debugger in production builds
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
