import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { getDb } from '@/db/client';
import { shareCodes } from '@/db/schema';
import { validateProfile } from '@/lib/validate';

export const dynamic = 'force-dynamic';
// No 0/O/1/I to keep codes readable when spoken.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `BV-${s.slice(0, 3)}-${s.slice(3)}`;
}

/** Snapshot a house under a short code. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = validateProfile(body?.house);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const db = await getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      await db.insert(shareCodes).values({ code, snapshot: parsed.value });
      return NextResponse.json({ code }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      /* collision, retry */
    }
  }
  return NextResponse.json({ error: 'could not allocate code' }, { status: 500 });
}
