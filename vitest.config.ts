import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',

    // Global test setup
    globals: true,
    setupFiles: ['./src/test/setup.ts'],

    // Coverage configuration
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '**/*.config.*', '**/*.d.ts', '**/types/**'],
    },

    // Test patterns
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.git', '.vscode'],
  },

  // Path resolution (same as main Vite config)
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/systems': resolve(__dirname, 'src/systems'),
      '@/assets': resolve(__dirname, 'src/assets'),
      '@/shaders': resolve(__dirname, 'src/shaders'),
      '@/ai': resolve(__dirname, 'src/ai'),
      '@/utils': resolve(__dirname, 'src/utils'),
    },
  },

  // Define globals for testing
  define: {
    // Mock WebGL for tests if needed
    'import.meta.vitest': undefined,
  },
});
