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
import { google } from 'googleapis';
import { appRouter } from './routers';
import { createContext, type TrpcContext, type User } from './_core/context';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import * as db from './db';

// Simple session store (in production, use Redis or database)
const sessions = new Map<string, { openId: string; expiresAt: number }>();

function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://counselflow-ashy.vercel.app/api/auth/callback'
  );
}

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

  // Production: validate session
  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expired' });
  }

  try {
    const user = await db.getUserByOpenId(session.openId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Login endpoint
app.get('/api/auth/login', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    // Set session cookie for dev mode
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, 'dev-session-' + Date.now(), cookieOptions);
    return res.redirect('/');
  }

  // Production: redirect to Google OAuth
  const oauth2Client = getGoogleOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
  });
  res.redirect(authUrl);
});

// OAuth callback endpoint
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.id || !userInfo.email) {
      return res.status(400).json({ error: 'Failed to get user info' });
    }

    // Find or create user
    let user = await db.getUserByOpenId(userInfo.id);
    if (!user) {
      await db.createUser({
        openId: userInfo.id,
        name: userInfo.name || userInfo.email,
        email: userInfo.email,
        loginMethod: 'google',
        role: 'user',
      });
      user = await db.getUserByOpenId(userInfo.id);
    }

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    sessions.set(sessionId, { openId: userInfo.id, expiresAt });

    // Set cookie and redirect
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionId, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
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

      if (sessionId) {
        if (process.env.NODE_ENV !== 'production') {
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
        } else {
          // Production: validate session
          const session = sessions.get(sessionId);
          if (session && session.expiresAt > Date.now()) {
            try {
              const dbUser = await db.getUserByOpenId(session.openId);
              if (dbUser) {
                user = dbUser as User;
              }
            } catch (error) {
              console.error('Error fetching user in tRPC context:', error);
            }
          }
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
