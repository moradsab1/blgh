import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // When deploying to GitHub Pages the app lives at /blgh/
  base: process.env.GITHUB_PAGES === 'true' ? '/blgh/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
