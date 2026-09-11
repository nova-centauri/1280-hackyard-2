import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { sessions } from '@/db/schema';

export const SESSION_COOKIE = 'bv_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Returns the session id, creating the cookie and row on first contact. */
export async function getOrCreateSession(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(SESSION_COOKIE)?.value;
  const db = await getDb();
  if (id && /^[a-f0-9]{64}$/.test(id)) {
    const row = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, id)).limit(1);
    if (row.length) {
      await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
      return id;
    }
  }
  id = randomBytes(32).toString('hex');
  await db.insert(sessions).values({ id });
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  });
  return id;
}

export async function getSessionId(): Promise<string | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  return id && /^[a-f0-9]{64}$/.test(id) ? id : null;
}
