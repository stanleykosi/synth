import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function unauthorized() {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="SYNTH Admin"'
    }
  });
}

export function middleware(request: NextRequest) {
  const username = process.env.ADMIN_BASIC_USER;
  const password = process.env.ADMIN_BASIC_PASS;

  if (!username || !password) {
    return NextResponse.next();
  }

  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return unauthorized();
  }

  const base64 = auth.slice(6).trim();
  const decoded = typeof atob === 'function' ? atob(base64) : '';
  const [user, pass] = decoded.split(':');

  if (user !== username || pass !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
