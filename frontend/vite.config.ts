import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El simulador corre entero en el navegador (src/engine/simulador.js, generado por TeaVM
// desde el nucleo Java), asi que no hay servidor de la aplicacion. En desarrollo, /docs/ se
// redirige al servidor de VitePress (npm run docs:dev, puerto 5174), que dev.sh levanta
// junto con este; en produccion el sitio ya esta construido en dist/docs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // ejemplos/ esta fuera de frontend/: el servidor de desarrollo tiene que poder leerlo.
    fs: { allow: ['..'] },
    // ws: la recarga en caliente de VitePress tambien pasa por aca
    proxy: { '/docs': { target: 'http://localhost:5174', ws: true } },
  },
});
