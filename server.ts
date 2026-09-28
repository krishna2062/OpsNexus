import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './server/app';
import { config } from './server/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const port = config.port || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In development mode, mount Vite middleware into Express
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port,
        hmr: false, // HMR disabled per constraints
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // In production, serve the built Vite SPA from /dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[OpsNexus Server] running on http://0.0.0.0:${port} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer().catch((err) => {
  console.error('[OpsNexus Server] Failed to start server:', err);
  process.exit(1);
});
