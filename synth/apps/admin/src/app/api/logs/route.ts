import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOGS_FILE = path.join(process.cwd(), 'data', 'logs.json');

export async function GET() {
  try {
    const data = await fs.readFile(LOGS_FILE, 'utf-8');
    const logs = JSON.parse(data);
    return NextResponse.json(logs);
  } catch {
    // Rate limiting should be applied at the edge for admin endpoints.
    return NextResponse.json([]);
  }
}
