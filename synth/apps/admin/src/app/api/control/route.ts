import { NextResponse } from 'next/server';

interface ControlPayload {
  action: 'pause' | 'resume' | 'run' | 'detect' | 'override' | 'unlock' | 'clear-drops' | 'clear-trends' | 'clear-chat' | 'reset-memory' | 'clear-queue';
  signalId?: string;
  force?: boolean;
}

function isValidPayload(payload: unknown): payload is ControlPayload {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as ControlPayload;
  if (
    data.action === 'pause' ||
    data.action === 'resume' ||
    data.action === 'run' ||
    data.action === 'detect' ||
    data.action === 'unlock' ||
    data.action === 'clear-drops' ||
    data.action === 'clear-trends' ||
    data.action === 'clear-chat' ||
    data.action === 'reset-memory' ||
    data.action === 'clear-queue'
  ) {
    if ((data.action === 'run' || data.action === 'detect') && data.force !== undefined && typeof data.force !== 'boolean') {
      return false;
    }
    return true;
  }
  if (data.action === 'override') {
    return typeof data.signalId === 'string' && data.signalId.trim().length > 0;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const payload = await request.json();
    if (!isValidPayload(payload)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const apiUrl = process.env.AGENT_API_URL;
    if (apiUrl) {
      const res = await fetch(`${apiUrl}/api/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.ADMIN_SECRET ?? ''
        },
        body: JSON.stringify({
          action: payload.action,
          signalId: payload.signalId,
          force: payload.force
        })
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    }

    if (payload.action === 'pause' || payload.action === 'resume') {
      const nextStatus = payload.action === 'pause' ? 'paused' : 'active';
      return NextResponse.json({ status: nextStatus });
    }
    return NextResponse.json({ error: 'Agent API unavailable' }, { status: 502 });
  } catch {
    // Rate limiting should be applied at the edge for admin endpoints.
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
