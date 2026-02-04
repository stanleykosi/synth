import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TRENDS_FILE = path.join(process.cwd(), 'data', 'trends.json');

export async function GET() {
  try {
    const data = await fs.readFile(TRENDS_FILE, 'utf-8');
    const trends = JSON.parse(data);
    return NextResponse.json(trends);
  } catch {
    // Consider edge rate limiting if this endpoint is exposed publicly.
    return NextResponse.json([]);
  }
}
