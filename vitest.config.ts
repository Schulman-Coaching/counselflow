import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      testTimeout: 30000, // 30 seconds for tests that call LLM
      env: {
        DATABASE_URL: env.DATABASE_URL,
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './client/src'),
        '@shared': path.resolve(__dirname, './shared'),
      },
    },
  };
});
