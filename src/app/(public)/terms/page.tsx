import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Use' };

export default function TermsPage() {
  return (
    <div className="py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Use</h1>
      <p className="mt-3 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
