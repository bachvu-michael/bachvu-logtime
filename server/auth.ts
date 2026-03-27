import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const tokens = new Set<string>();

export const authRouter = Router();

// GET /api/auth/status
authRouter.get('/status', (_req: Request, res: Response) => {
  res.json({ required: !!process.env.APP_PASSWORD });
});

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const password = process.env.APP_PASSWORD;
  const { password: provided } = req.body as { password?: string };

  if (password && provided !== password) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  tokens.add(token);
  res.json({ token });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) tokens.delete(auth.slice(7));
  res.json({ ok: true });
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!process.env.APP_PASSWORD) return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  if (!tokens.has(auth.slice(7))) return res.status(401).json({ error: 'Invalid token' });
  next();
}
