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

export function middleware(request: NextRequest) {
  const username = process.env.ADMIN_BASIC_USER?.trim();
  const password = process.env.ADMIN_BASIC_PASS?.trim();

  if (!username || !password) {
    return NextResponse.next();
  }

  const auth = request.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('basic ')) {
    return unauthorized();
  }

  const base64 = auth.slice(6).trim();
  let decoded = '';
  try {
    decoded = typeof atob === 'function' ? atob(base64) : '';
  } catch {
    return unauthorized();
  }
  const separatorIndex = decoded.indexOf(':');
  const user = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
  const pass = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';

  if (user !== username || pass !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
