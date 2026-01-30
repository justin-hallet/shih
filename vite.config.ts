import { defineConfig } from 'vite';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import glsl from 'vite-plugin-glsl';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // Base URL for the app (adjust for deployment)
  base: '/shih/',

  assetsInclude: ['**/*.mp3', '**/*.fbx', '**/*.glb', '**/*.png'],
  
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
          three: ['three'],
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
    // GLSL shader support
    glsl({
      include: '**/*.{glsl,vs,fs,vert,frag}',
      exclude: 'node_modules/**',
      warnDuplicatedImports: true,
      defaultExtension: 'glsl',
      compress: false,
    }),

    // PWA support with service worker
    VitePWA({
      base: '/shih/',
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
      },
      includeAssets: ['favicon.ico', 'manifest.json'],
      manifest: {
        name: 'Space Harrier: Infinite Horizons',
        short_name: 'Space Harrier',
        description: 'An open-world reimagining of the classic Space Harrier arcade game',
        theme_color: '#1e3c72',
        background_color: '#2a5298',
        display: 'fullscreen',
        start_url: '/shih/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),

    // Static asset copying for game assets (when assets exist)
    viteStaticCopy({
      targets: [
        {
          src: 'src/assets/models/**/*',
          dest: 'assets/models',
          noErrorOnMissing: true,
        },
        {
          src: 'src/assets/textures/**/*',
          dest: 'assets/textures',
          noErrorOnMissing: true,
        },
        {
          src: 'src/assets/audio/**/*',
          dest: 'assets/audio',
          noErrorOnMissing: true,
        },
      ],
    }),

    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE &&
      visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

  // PWA and service worker settings
  define: {
    // Global constants
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },

  // Optimization settings
  optimizeDeps: {
    include: ['three'],
  },
});
