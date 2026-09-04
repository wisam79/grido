import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-mock',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/version') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ tag_name: 'v2.4.0', channel: 'stable' }));
            return;
          }
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    include: ['three'],
  },
});
