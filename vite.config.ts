import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ✅ ADDED: Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // ✅ KEPT: Your existing optimizeDeps config
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});