import http from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase, AuditRepo } from './server/db';
import { initSocketIO } from './server/socket';
import { authRouter } from './server/routes/authRoutes';
import { posRouter } from './server/routes/posRoutes';
import { adminRouter } from './server/routes/adminRoutes';

async function startServer() {
  console.log('[ShopPOS Backend] Initializing MongoDB persistence & collections...');
  await initDatabase();

  const app = express();
  const httpServer = http.createServer(app);

  console.log('[ShopPOS Backend] Initializing Socket.IO realtime connection engine...');
  initSocketIO(httpServer);

  const PORT = parseInt(process.env.PORT || '10000', 10);
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;

  // Render-friendly CORS handler: allows owner static frontend & custom domains
  const originHandler = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) return callback(null, true);
    if (!allowedOriginsEnv || allowedOriginsEnv === '*') {
      return callback(null, true);
    }
    const list = allowedOriginsEnv.split(',').map((s) => s.trim().toLowerCase());
    const originLower = origin.toLowerCase();
    if (list.includes(originLower) || originLower.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Safe default for deployments
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
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint for Render.com zero-downtime health probes
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'shoppos-backend-and-admin',
      env: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', posRouter);

  // Serve Admin Panel (Packaged together with Backend Web Service)
  const possibleAdminPaths = [
    path.resolve(process.cwd(), 'public/admin'),
    path.resolve(process.cwd(), 'admin_dist'),
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), '../admin/dist'),
  ];

  let adminStaticPath: string | null = null;
  for (const p of possibleAdminPaths) {
    if (fs.existsSync(p)) {
      adminStaticPath = p;
      break;
    }
  }

  if (adminStaticPath) {
    console.log(`[ShopPOS Backend] Serving Admin Portal static files from ${adminStaticPath}`);
    app.use('/admin', express.static(adminStaticPath));
    app.use(express.static(adminStaticPath));

    app.get(['/admin', '/admin/*'], (_req, res) => {
      res.sendFile(path.join(adminStaticPath!, 'index.html'));
    });

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(adminStaticPath!, 'index.html'));
    });
  } else {
    // If Admin frontend hasn't been compiled into public yet, provide an informative status dashboard
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ShopPOS Backend & Admin Web Service</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; max-width: 540px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            h1 { font-size: 1.5rem; margin-top: 0; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem; }
            .badge { display: inline-block; background: #0284c7; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; margin-bottom: 1rem; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
            .endpoints { background: #0f172a; padding: 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.85rem; color: #38bdf8; margin: 1rem 0; border: 1px solid #1e293b; }
            .endpoints div { margin-bottom: 0.25rem; }
            .success { color: #4ade80; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Render Web Service</span>
            <h1>ShopPOS Backend & Admin API</h1>
            <p>The backend Web Service is running successfully with MongoDB persistence and realtime WebSockets.</p>
            <div class="endpoints">
              <div><span class="success">●</span> Health Probe: <strong>/api/health</strong></div>
              <div><span class="success">●</span> API Endpoints: <strong>/api/*</strong></div>
              <div><span class="success">●</span> Realtime Sockets: <strong>/socket.io</strong></div>
              <div><span class="success">●</span> 2-Day Auto-Purge: <strong>Active</strong></div>
            </div>
            <p>Connect your Owner Frontend (Render Static Site) by setting environment variable:</p>
            <div class="endpoints">
              VITE_API_URL = ${req.protocol}://${req.get('host')}
            </div>
          </div>
        </body>
        </html>
      `);
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ShopPOS Backend] Running Web Service at http://0.0.0.0:${PORT}`);

    // Recurring auto-purge: purge audit & system events older than 2 days every 1 hour
    const PURGE_INTERVAL_MS = 60 * 60 * 1000;
    setInterval(async () => {
      try {
        const removed = await AuditRepo.purgeOlderThanDays(2);
        if (removed > 0) {
          console.log(`[AuditPurge] Auto-purged ${removed} audit log(s) older than 2 days`);
        }
      } catch (err) {
        console.warn('[AuditPurge] Error during periodic 2-day audit purge:', err);
      }
    }, PURGE_INTERVAL_MS);
  });

  const handleExit = () => {
    console.log('[ShopPOS Backend] Received exit signal, shutting down gracefully...');
    httpServer.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleExit);
  process.on('SIGINT', handleExit);
}

startServer().catch((err) => {
  console.error('[ShopPOS Backend] Fatal server startup error:', err);
  process.exit(1);
});
