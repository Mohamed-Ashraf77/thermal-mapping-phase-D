import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pdfExportPlugin } from './vite-plugins/pdfExportPlugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), pdfExportPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
