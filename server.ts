import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { onRequestGet } from './functions/api/health.ts';
import { onRequestPost } from './functions/api/ai/assist.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

async function sendResponse(res: express.Response, response: Response) {
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(response.status).send(await response.text());
}

app.get('/api/health', (_req, res) => sendResponse(res, onRequestGet({ env: process.env })));
app.post('/api/ai/assist', express.raw({ type: '*/*', limit: '48kb' }), async (req, res, next) => {
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(name, value);
    }
    const request = new Request('http://localhost/api/ai/assist', {
      method: 'POST', headers, body: Buffer.isBuffer(req.body) ? Uint8Array.from(req.body) : undefined,
    });
    await sendResponse(res, await onRequestPost({ request, env: process.env }));
  } catch (error) {
    next(error);
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const allowedHosts = ['.run.app'];
    if (process.env.APP_URL) {
      try {
        allowedHosts.push(new URL(process.env.APP_URL).hostname);
      } catch {
        // Ignore invalid APP_URL
      }
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        ws: { server: httpServer },
        allowedHosts,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Dijital Evrenim sunucusu http://0.0.0.0:${PORT} adresinde çalışıyor.`);
  });
}

startServer();
