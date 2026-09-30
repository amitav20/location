/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { findUserById, getSessions, initDB, UPLOADS_DIR } from './src/server/db';
import { hashToken } from './src/server/auth';
import { HttpError } from './src/server/http';
import { authRouter } from './src/server/routes/auth';
import { usersRouter } from './src/server/routes/users';
import { postsRouter } from './src/server/routes/posts';
import { storiesRouter } from './src/server/routes/stories';
import { messagingRouter } from './src/server/routes/messaging';
import { eventsRouter } from './src/server/routes/events';
import { businessesRouter } from './src/server/routes/businesses';
import { marketplaceRouter } from './src/server/routes/marketplace';
import { notificationsRouter } from './src/server/routes/notifications';
import { adminRouter } from './src/server/routes/admin';
import { geoRouter } from './src/server/routes/geo';
import { uploadsRouter } from './src/server/routes/uploads';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Uploads carry base64 files, so only that route gets a large body limit
app.use('/api/uploads', express.json({ limit: '12mb' }));
app.use(express.json({ limit: '1mb' }));

initDB();

// ---------- Authentication ----------
// Every /api route needs a valid session token ("Authorization: Bearer <token>") except these:
const PUBLIC_ROUTES = new Set(['POST /auth/register', 'POST /auth/login', 'GET /geo/reverse', 'GET /geo/search']);

app.use('/api', (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token) {
    const tokenHash = hashToken(token);
    const session = getSessions().find((s) => s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > Date.now());
    const user = session && findUserById(session.userId);
    if (session && user && !user.isBanned) {
      req.userId = user.id;
      req.sessionTokenHash = tokenHash;
    }
  }

  if (!req.userId && !PUBLIC_ROUTES.has(`${req.method} ${req.path}`)) {
    res.status(401).json({ error: 'Please sign in.' });
    return;
  }
  next();
});

app.use(
  '/api',
  authRouter,
  usersRouter,
  postsRouter,
  storiesRouter,
  messagingRouter,
  eventsRouter,
  businessesRouter,
  marketplaceRouter,
  notificationsRouter,
  adminRouter,
  geoRouter,
  uploadsRouter
);

// Unknown API paths get a JSON 404 instead of falling through to the web app
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Uploaded media (types are allow-listed at upload time)
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', fallthrough: false }));

// Errors thrown in route handlers (validation, permissions, ...) become JSON responses
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
  } else if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'That file or request is too large.' });
  } else if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid request body.' });
  } else if (err?.status === 404 || err?.statusCode === 404) {
    res.status(404).json({ error: 'Not found.' });
  } else {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  }
});

// Express static server asset pipeline
async function startServer() {
  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully booted on http://localhost:${PORT}`);
  });
}

startServer();
