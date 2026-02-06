import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.AGENT_API_URL;
  if (apiUrl) {
    const res = await fetch(`${apiUrl}/api/chat`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  }

  return NextResponse.json([]);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const apiUrl = process.env.AGENT_API_URL;
    if (apiUrl) {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.ADMIN_SECRET ?? ''
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    }
    return NextResponse.json({ error: 'Agent API unavailable' }, { status: 502 });
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
