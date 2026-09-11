import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { houses } from '@/db/schema';
import { getOrCreateSession, getSessionId } from '@/lib/session';
import { validateProfile } from '@/lib/validate';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };

/** The current session's house, or null. Never creates a session on read. */
export async function GET() {
  const sid = await getSessionId();
  if (!sid) return NextResponse.json({ house: null }, { headers: noStore });
  const db = await getDb();
  const row = await db.select().from(houses).where(eq(houses.sessionId, sid)).limit(1);
  return NextResponse.json({ house: row[0]?.data ?? null, updatedAt: row[0]?.updatedAt ?? null }, { headers: noStore });
}

/** Upsert the session's house. Creates the session cookie on first save. */
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = validateProfile(body?.house);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  const sid = await getOrCreateSession();
  const db = await getDb();
  const now = new Date();
  await db
    .insert(houses)
    .values({ sessionId: sid, data: parsed.value, updatedAt: now })
    .onConflictDoUpdate({ target: houses.sessionId, set: { data: parsed.value, updatedAt: now } });
  return NextResponse.json({ ok: true, updatedAt: now.toISOString() }, { headers: noStore });
}
