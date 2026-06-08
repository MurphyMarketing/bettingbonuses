/**
 * Bootstrap an admin user for credentials login.
 *
 *   npm run create-admin -- --email=you@example.com --password='at least 12 chars'
 *
 * Both --email and --password are required; --name is optional (defaults to the
 * email local-part). Passwords shorter than 12 characters are rejected. On
 * success the new user's id is printed. Refuses to overwrite an existing email.
 *
 * Runs via tsx (outside Next.js), so it loads .env.local with @next/env before
 * touching the DB client.
 */
import { loadEnvConfig } from '@next/env';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

const USAGE = `Usage:
  npm run create-admin -- --email=<email> --password=<password> [--name=<name>]

  --email     required. Admin email, used as the login identifier.
  --password  required. Minimum 12 characters.
  --name      optional. Display name (defaults to the email local-part).`;

function fail(message: string): never {
  console.error(`\nError: ${message}\n\n${USAGE}\n`);
  process.exit(1);
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const email = getArg('email')?.toLowerCase().trim();
  const password = getArg('password');
  const name = getArg('name')?.trim();

  if (!email) fail('--email is required.');
  if (!password) fail('--password is required.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`--password must be at least ${MIN_PASSWORD_LENGTH} characters (got ${password.length}).`);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail(`"${email}" does not look like a valid email address.`);
  }

  loadEnvConfig(process.cwd());
  const { db } = await import('./index');

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length > 0) {
    fail(`A user with email ${email} already exists (id ${existing[0].id}).`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const [created] = await db
    .insert(schema.users)
    .values({ email, name: name || email.split('@')[0], passwordHash })
    .returning({ id: schema.users.id });

  console.log(`\n✓ Created admin user\n  id:    ${created.id}\n  email: ${email}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('create-admin failed:', err);
  process.exit(1);
});
