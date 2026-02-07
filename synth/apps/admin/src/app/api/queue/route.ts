import { NextResponse } from 'next/server';

const AGENT_API_URL = process.env.AGENT_API_URL;

export async function GET() {
  if (AGENT_API_URL) {
    const res = await fetch(`${AGENT_API_URL}/api/queue`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  }

  return NextResponse.json({ items: [] });
}
