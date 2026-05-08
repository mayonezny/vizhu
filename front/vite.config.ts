import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(async ({ mode }) => {
  // Загружаем .env.{mode} чтобы переменные были доступны на этапе конфигурации
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  // Анализатор бандла — включается через: ANALYZE=true npm run build
  const extraPlugins: Plugin[] = [];
  if (env.ANALYZE) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    extraPlugins.push(
      visualizer({ open: true, gzipSize: true, brotliSize: true, filename: 'dist/stats.html' }),
    );
  }

  const pwaPlugin = VitePWA({
    registerType: 'autoUpdate',

    includeAssets: ['favicon.ico', 'icons/*.png'],

    manifest: false,

    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 7,
            },
          },
        },
      ],
    },

    devOptions: {
      enabled: true, // важно: чтобы PWA работала и в dev
    },
  });

  return {
    plugins: [react(), pwaPlugin, ...extraPlugins],

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },

    // ─── Dev-сервер ───────────────────────────────────────────────────────
    server: {
      port: 3000,
      strictPort: false,
      open: true,
    },

    // ─── Сборка ───────────────────────────────────────────────────────────
    build: {
      target: 'es2022',
      outDir: 'dist',
      // Source maps в dev для отладки; в prod отключены (безопасность + размер)
      sourcemap: !isProd,
      rollupOptions: {
        output: {
          // Разделение vendor-чанков для долгосрочного кэширования.
          // Хэш меняется только при обновлении конкретной библиотеки.
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'query-vendor': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
            'zustand-vendor': ['zustand'],
          },
        },
      },
    },

    // ─── SCSS ─────────────────────────────────────────────────────────────
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: [resolve(__dirname, 'src')],
        },
      },
    },

    // ─── Preview (vite preview) ───────────────────────────────────────────
    preview: {
      port: 4173,
    },
  };
});
