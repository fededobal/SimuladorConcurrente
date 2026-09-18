/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origen del backend, sin barra final. Vacio en desarrollo: el proxy de Vite
   * redirige /api a http://localhost:8080.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
