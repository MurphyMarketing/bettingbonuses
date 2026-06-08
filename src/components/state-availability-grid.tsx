import Link from 'next/link';

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/**
 * Visual grid of state availability. Takes an array of region codes; each card
 * shows the abbreviation with the full state name on hover. Pass `hrefFor` to
 * make cards link (e.g. to a brand × region page). Text-on-card by design — no
 * SVG outlines for Phase 2.
 */
export function StateAvailabilityGrid({
  codes,
  hrefFor,
}: {
  codes: string[];
  hrefFor?: (code: string) => string | undefined;
}) {
  const sorted = [...new Set(codes)].sort((a, b) =>
    (US_STATES[a] ?? a).localeCompare(US_STATES[b] ?? b),
  );
  const cardClass =
    'flex h-12 items-center justify-center rounded-md border bg-card text-sm font-semibold tabular-nums transition-colors hover:bg-muted';

  return (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
      {sorted.map((code) => {
        const name = US_STATES[code] ?? code;
        const href = hrefFor?.(code);
        return (
          <li key={code}>
            {href ? (
              <Link href={href} title={name} className={cardClass}>
                {code}
              </Link>
            ) : (
              <span title={name} className={`${cardClass} cursor-default`}>
                {code}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
