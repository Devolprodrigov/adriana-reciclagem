import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/', // ISSO resolve o erro 404 da sua foto!
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});