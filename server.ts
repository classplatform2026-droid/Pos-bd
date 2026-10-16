import http from 'http';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { initDatabase, AuditRepo } from './server/db';
import { initSocketIO } from './server/socket';
import { authRouter } from './server/routes/authRoutes';
import { posRouter } from './server/routes/posRoutes';
import { adminRouter } from './server/routes/adminRoutes';

async function startServer() {
  console.log('[ShopPOS Server] Initializing MongoDB persistence & collections...');
  await initDatabase();

  const app = express();
  const httpServer = http.createServer(app);

  console.log('[ShopPOS Server] Initializing Socket.IO realtime connection engine...');
  initSocketIO(httpServer);

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;

  const originHandler = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) return callback(null, true);
    if (allowedOriginsEnv && allowedOriginsEnv !== '*') {
      const list = allowedOriginsEnv.split(',').map((s) => s.trim());
      if (list.includes(origin)) {
        return callback(null, true);
      }
    }
    return callback(null, true);
  };

  app.use(
    cors({
      origin: originHandler,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'shoppos-owner',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', posRouter);

  if (!isProd) {
    console.log('[ShopPOS Server] Attaching Vite development middleware...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ShopPOS Server] Serving POS web app with Realtime WebSockets at http://0.0.0.0:${PORT}`);

    // Recurring auto-purge: purge audit & system events older than 90 days every 24 hours
    const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        await AuditRepo.purgeOlderThanDays(90);
      } catch (err) {
        console.warn('[AuditPurge] Error during periodic 90-day audit purge:', err);
      }
    }, PURGE_INTERVAL_MS);
  });

  const handleExit = () => {
    console.log('[ShopPOS Server] Received exit signal, closing server gracefully...');
    httpServer.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleExit);
  process.on('SIGINT', handleExit);
}

startServer().catch((err) => {
  console.error('[ShopPOS Server] Fatal server startup error:', err);
  process.exit(1);
});
