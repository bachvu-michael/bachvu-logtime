import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const FE_PORT  = parseInt(env.FE_PORT  || '5173');
  const API_PORT = parseInt(env.API_PORT || '3001');

  return {
    plugins: [react()],
    server: {
      port: FE_PORT,
      proxy: {
        '/api': {
          target: `http://localhost:${API_PORT}`,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: FE_PORT,
    },
  };
});
