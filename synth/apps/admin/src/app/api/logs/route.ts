import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.AGENT_API_URL;
  if (apiUrl) {
    const res = await fetch(`${apiUrl}/api/logs`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  }

  // Rate limiting should be applied at the edge for admin endpoints.
  return NextResponse.json([]);
}
