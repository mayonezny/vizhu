/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Type-safe environment variables.
 * All VITE_* vars defined here are validated at runtime in src/shared/config/env.ts.
 * Add new vars here AND in .env.example when extending the app.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_ENV: 'development' | 'production' | 'test';
  readonly VITE_ENABLE_DEVTOOLS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
