import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Authors' };

export default function AuthorsPage() {
  return (
    <div className="py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Authors</h1>
      <p className="mt-3 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
