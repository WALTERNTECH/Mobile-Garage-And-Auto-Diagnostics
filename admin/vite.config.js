import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5320,
    proxy: { '/api': 'http://localhost:5321' },
  },
  build: { outDir: 'dist', sourcemap: false },
});
