/**
 * Next.js 16 proxy (Node runtime — no edge). Runs on every request (except
 * static assets) to do two things, in order:
 *   1. DB-backed redirects (WordPress -> Next cutover), checked FIRST so they
 *      never get caught by auth gating. Cached in-memory (60s TTL).
 *   2. Admin route protection: /admin/* requires a session, except /admin/login.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { getActiveRedirects } from '@/lib/redirects-cache';

export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl;

  // 1. Redirects (exact from_path match).
  const redirects = await getActiveRedirects();
  const target = redirects.get(pathname);
  if (target) {
    const destination = target.toPath.startsWith('http')
      ? target.toPath
      : new URL(target.toPath, req.nextUrl.origin).toString();
    return NextResponse.redirect(destination, target.statusCode === 302 ? 302 : 301);
  }

  // 2. Admin protection.
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!req.auth) {
      const loginUrl = new URL('/admin/login', req.nextUrl.origin);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

// Run on all paths except Next internals and common static files (so redirects
// can fire on any old URL). robots.txt / sitemap.xml are excluded.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
