/**
 * Next.js 16 proxy (formerly middleware.ts). Runs on the Node.js runtime —
 * which is exactly what we want: no edge runtime (Kinsta), and the DB-backed
 * session lookup below needs Node.
 *
 * Protects everything under /admin EXCEPT /admin/login (which must be reachable
 * while logged out). Unauthenticated requests are 307-redirected to the login
 * page with a callbackUrl back to where they were headed.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // The login page itself is always reachable.
  if (pathname === '/admin/login') return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL('/admin/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],
};
