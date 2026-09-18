import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El simulador corre entero en el navegador (src/engine/simulador.js, generado por TeaVM
// desde el nucleo Java), asi que no hay servidor al que redirigir: alcanza con servir.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
