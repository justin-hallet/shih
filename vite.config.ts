import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base URL for the app (adjust for deployment)
  base: '/',
  
  // Development server configuration
  server: {
    port: 3000,
    host: true, // Allow access from network
    open: true, // Open browser on start
  },

  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    
    // Optimize for PWA
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Code splitting for better caching
        manualChunks: {
          'three': ['three'],
          'vendor': ['@reduxjs/toolkit'],
        },
      },
    },
    
    // Asset size warnings (important for PWA)
    chunkSizeWarningLimit: 1000,
  },

  // Path resolution aliases
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

  // Plugin configuration
  plugins: [
    // Add plugins here as needed
  ],

  // PWA and service worker settings
  define: {
    // Global constants
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },

  // Optimization settings
  optimizeDeps: {
    include: [
      'three',
      '@reduxjs/toolkit',
    ],
  },
});
