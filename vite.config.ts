import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/', // MUDE DE '/adriana-reciclagem/' PARA '/'
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});