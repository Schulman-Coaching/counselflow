// Only load dotenv in development - in production, env vars are set by App Runner
if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv');
  const { fileURLToPath } = await import('url');
  const { dirname, resolve } = await import('path');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  config({ path: resolve(__dirname, '../../.env') });
}
import express from 'express';
import cookieParser from 'cookie-parser';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext, type TrpcContext, type User } from './_core/context';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import * as db from './db';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: true });
});

// ============================================
// Development Authentication Routes
// ============================================
const DEV_USER: User = {
  id: 1,
  openId: 'dev-user-001',
  email: 'dev@counselflow.local',
  name: 'Development User',
  loginMethod: 'dev',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Get current user
app.get('/api/auth/me', async (req, res) => {
  const sessionId = req.cookies[COOKIE_NAME];

  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // In development, return the dev user if session exists
  if (process.env.NODE_ENV !== 'production') {
    // Ensure dev user exists in database
    try {
      let user = await db.getUserByOpenId(DEV_USER.openId);
      if (!user) {
        await db.createUser({
          openId: DEV_USER.openId,
          name: DEV_USER.name,
          email: DEV_USER.email,
          loginMethod: DEV_USER.loginMethod,
          role: DEV_USER.role as 'admin' | 'user',
        });
        user = await db.getUserByOpenId(DEV_USER.openId);
      }
      return res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.json(DEV_USER);
    }
  }

  res.status(401).json({ error: 'Not authenticated' });
});

// Login endpoint (dev mode auto-login)
app.get('/api/auth/login', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    // Set session cookie for dev mode
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, 'dev-session-' + Date.now(), cookieOptions);
    return res.redirect('/');
  }

  // In production, would redirect to OAuth provider
  res.status(501).json({ error: 'OAuth not configured' });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

// ============================================
// tRPC API Routes
// ============================================
app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: async ({ req, res }): Promise<TrpcContext> => {
      const sessionId = req.cookies[COOKIE_NAME];
      let user: User | null = null;

      if (sessionId && process.env.NODE_ENV !== 'production') {
        // In dev mode, auto-authenticate
        try {
          const dbUser = await db.getUserByOpenId(DEV_USER.openId);
          if (dbUser) {
            user = dbUser as User;
          } else {
            user = DEV_USER;
          }
        } catch {
          user = DEV_USER;
        }
      }

      return { req, res, user };
    },
  })
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev mode: Auto-login enabled at /api/auth/login`);
  }
});

export type AppRouter = typeof appRouter;
