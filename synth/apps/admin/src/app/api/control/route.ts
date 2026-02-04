import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONTROL_FILE = path.join(process.cwd(), 'data', 'control.json');

interface ControlPayload {
  action: 'pause' | 'resume';
}

function isValidPayload(payload: unknown): payload is ControlPayload {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as ControlPayload;
  return data.action === 'pause' || data.action === 'resume';
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

    const nextStatus = payload.action === 'pause' ? 'paused' : 'active';
    await fs.mkdir(path.dirname(CONTROL_FILE), { recursive: true });
    await fs.writeFile(
      CONTROL_FILE,
      JSON.stringify({ status: nextStatus, updatedAt: new Date().toISOString() }, null, 2)
    );

    return NextResponse.json({ status: nextStatus });
  } catch {
    // Rate limiting should be applied at the edge for admin endpoints.
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
