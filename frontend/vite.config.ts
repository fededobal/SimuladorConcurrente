import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// El simulador corre entero en el navegador (src/engine/simulador.js, generado por TeaVM
// desde el nucleo Java), asi que no hay servidor de la aplicacion. En desarrollo, /docs/ se
// redirige al servidor de VitePress (npm run docs:dev, puerto 5174), que dev.sh levanta
// junto con este; en produccion el sitio ya esta construido en dist/docs.
export default defineConfig({
  plugins: [react()],
  // Tests de la interfaz (npm run test): logica pura, sin navegador. Lo que se ve en pantalla
  // se prueba a mano y con el smoke del motor.
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
  server: {
    port: 5173,
    // ejemplos/ esta fuera de frontend/: el servidor de desarrollo tiene que poder leerlo.
    fs: { allow: ['..'] },
    // ws: la recarga en caliente de VitePress tambien pasa por aca
    proxy: { '/docs': { target: 'http://localhost:5174', ws: true } },
  },
});
