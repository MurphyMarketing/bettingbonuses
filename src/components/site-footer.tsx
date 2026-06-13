import Link from 'next/link';

type FooterGroup = { heading: string; links: { label: string; href: string }[] };

const FOOTER_GROUPS: FooterGroup[] = [
  {
    heading: 'Bonuses by type',
    links: [
      { label: 'Bonus bets', href: '/bonus-bets' },
      { label: 'No-deposit bonuses', href: '/no-deposit-bonuses' },
      { label: 'Odds boosts', href: '/odds-boosts' },
      { label: 'Cashback', href: '/cashback' },
      { label: 'Deposit match', href: '/deposit-bonus' },
      { label: 'Bet insurance', href: '/bet-insurance' },
    ],
  },
  {
    heading: 'Site',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Authors', href: '/authors' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-base font-bold tracking-tight">
            Betting<span className="text-primary">Bonuses</span>.com
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            If you or someone you know has a gambling problem, call{' '}
            <a href="tel:18004262537" className="font-medium underline underline-offset-2">
              1-800-GAMBLER
            </a>
            . 21+. Please gamble responsibly.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            BettingBonuses.com may earn a commission when you sign up through our links. This does
            not affect our rankings or reviews.
          </p>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.heading} aria-label={group.heading} className="flex flex-col gap-2">
              <p className="text-sm font-semibold">{group.heading}</p>
              {group.links.map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          © {year} BettingBonuses.com. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
