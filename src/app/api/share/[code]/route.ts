import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { shareCodes } from '@/db/schema';

export const dynamic = 'force-dynamic';

export function normalizeCode(raw: string) {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = s.startsWith('BV') ? s.slice(2) : s;
  return body.length === 6 ? `BV-${body.slice(0, 3)}-${body.slice(3)}` : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const norm = normalizeCode(code);
  if (!norm) return NextResponse.json({ error: 'bad code' }, { status: 400 });
  const db = await getDb();
  const row = await db.select().from(shareCodes).where(eq(shareCodes.code, norm)).limit(1);
  if (!row.length) return NextResponse.json({ error: 'not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ code: norm, house: row[0].snapshot }, { headers: { 'Cache-Control': 'no-store' } });
}
