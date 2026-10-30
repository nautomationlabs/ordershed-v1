/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'http';
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENV_LABEL?: string;
  readonly VITE_APP_VERSION?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
