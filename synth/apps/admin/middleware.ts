import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const realm = 'SYNTH Admin';

export function middleware(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return new NextResponse('ADMIN_SECRET is not configured', { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${realm}"` },
    });
  }

  try {
    const base64Credentials = auth.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');
    if (!username || password !== adminSecret) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': `Basic realm="${realm}"` },
      });
    }
  } catch {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${realm}"` },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
