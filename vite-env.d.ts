/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUD_FUNCTION_URL: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
