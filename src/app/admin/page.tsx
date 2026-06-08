import type { Metadata } from 'next';
import { auth, signOut } from '@/auth';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminHome() {
  // The proxy already guards /admin, so a session is guaranteed here.
  const session = await auth();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {session?.user?.email ?? 'unknown user'}.
      </p>

      <form
        className="mt-6"
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/admin/login' });
        }}
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
