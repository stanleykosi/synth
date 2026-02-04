import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TRENDS_FILE = path.join(process.cwd(), 'data', 'trends.json');
const AGENT_API_URL = process.env.AGENT_API_URL;

export async function GET() {
  if (AGENT_API_URL) {
    const res = await fetch(`${AGENT_API_URL}/api/trends`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  }

  try {
    const data = await fs.readFile(TRENDS_FILE, 'utf-8');
    const trends = JSON.parse(data);
    return NextResponse.json(trends);
  } catch {
    // Consider edge rate limiting if this endpoint is exposed publicly.
    return NextResponse.json([]);
  }
}
