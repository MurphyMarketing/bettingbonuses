'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  try {
    // On success this throws a redirect (NEXT_REDIRECT) which must propagate.
    await signIn('credentials', { email, password, redirectTo: '/admin' });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password.' };
    }
    throw error; // re-throw the redirect signal
  }
}
