/**
 * Auth.js (NextAuth v5) — admin auth only.
 *
 * - Credentials provider ONLY (no OAuth in Phase 1).
 * - JWT session strategy with a short (8h) lifetime. Auth.js hard-blocks the
 *   database session strategy when the only provider is credentials
 *   (UnsupportedStrategy), so JWT is the supported path here. Sessions can't be
 *   hard-revoked before expiry; the short maxAge bounds that, and we can layer a
 *   DB revocation-list check into the callbacks later if it becomes necessary.
 * - No adapter: with credentials + JWT the adapter is unused (we look the user
 *   up directly in authorize). The users table is the source of truth; the
 *   accounts/sessions/verification_tokens tables exist for a future adapter/OAuth.
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours, in seconds

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Step 3 env uses NEXTAUTH_SECRET; v5 also reads AUTH_SECRET. Accept either.
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  pages: { signIn: '/admin/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (creds) => {
        const email = (creds?.email as string | undefined)?.toLowerCase().trim();
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // Surface the user id on the session (token.sub) for stamping actions
    // like the offer "Verify now" button in Step 8.
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});
