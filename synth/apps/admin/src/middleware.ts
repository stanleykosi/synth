import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function unauthorized() {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="SYNTH Admin (App)"'
    }
  });
}

function decodeBasicAuth(value: string): { user: string; pass: string } | null {
  const base64 = value.slice(6).trim();
  if (!base64) return null;
  let decoded = '';
  try {
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(base64, 'base64').toString('utf-8');
    } else if (typeof atob === 'function') {
      decoded = atob(base64);
    }
  } catch {
    return null;
  }
  const separatorIndex = decoded.indexOf(':');
  const user = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
  const pass = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';
  return { user, pass };
}

export function middleware(request: NextRequest) {
  const username = process.env.ADMIN_BASIC_USER?.trim();
  const password = process.env.ADMIN_BASIC_PASS?.trim();

  if (!username || !password) {
    return NextResponse.next();
  }

  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization') ?? '';
  if (!auth.toLowerCase().startsWith('basic ')) {
    return unauthorized();
  }

  const parsed = decodeBasicAuth(auth);
  if (!parsed) {
    return unauthorized();
  }

  if (parsed.user !== username || parsed.pass !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
};
