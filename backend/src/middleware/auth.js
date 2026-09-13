import { supabase } from '../lib/supabase.js';

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Uses the service role client which reliably validates user JWTs server-side.
 * Attaches req.user (the Supabase user object) and req.userId.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error('[auth] getUser error:', error?.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  req.userId = data.user.id;
  next();
}
