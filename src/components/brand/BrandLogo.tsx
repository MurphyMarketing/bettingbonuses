import { cn } from '@/lib/utils';

/**
 * Shared brand-logo slot. Sized to the real uploaded-logo footprint (250×125,
 * a 2:1 aspect ratio) so that real images and the no-logo placeholder occupy
 * the *identical* box — uploading a logo later causes zero layout shift.
 *
 * - With a logo, the <img> fills the 2:1 slot with object-fit: contain.
 * - Without one, a soft per-brand-tinted placeholder shows the full brand name,
 *   centered and semibold, auto-shrinking + wrapping (max 2 lines) for long
 *   names like "DraftKings Sportsbook".
 *
 * Note on assets: this slot is horizontal (2:1), so it uses the horizontal
 * `logoUrl`. The square `logoSquareUrl` is accepted only as a fallback so a
 * brand that has *only* a square logo still renders an image rather than the
 * placeholder; real horizontal logos take precedence.
 */

// Light background / darker text pairs — each chosen for safe text contrast.
const PLACEHOLDER_PALETTE = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#E1F5EE', text: '#0F6E56' },
  { bg: '#FAEEDA', text: '#854F0B' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#F1EFE8', text: '#444441' },
] as const;

// Deterministic 32-bit string hash so a given slug always maps to the same tint.
function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (Math.imul(h, 31) + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Step text size down by name length so long names stay within ~2 lines.
function placeholderFontSize(name: string): number {
  const len = name.length;
  if (len <= 10) return 18;
  if (len <= 16) return 17;
  if (len <= 22) return 15;
  return 13;
}

export function BrandLogo({
  name,
  slug,
  logoUrl,
  logoSquareUrl,
  className,
  hideName = false,
}: {
  name: string;
  slug: string;
  logoUrl?: string | null;
  logoSquareUrl?: string | null;
  className?: string;
  // Tile/compact mode: when there's no uploaded logo, render just the deterministic
  // tint block with no text (the full name would clip at tile sizes). Only the
  // placeholder is affected — a real logo image always renders. Default off so
  // every other call site keeps the full-name placeholder.
  hideName?: boolean;
}) {
  const src = logoUrl ?? logoSquareUrl ?? null;
  const tint = PLACEHOLDER_PALETTE[hashSlug(slug) % PLACEHOLDER_PALETTE.length];

  return (
    <div className={cn('relative aspect-[2/1] w-full overflow-hidden rounded-md', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- static logo asset
        <img src={src} alt={`${name} logo`} className="size-full object-contain" />
      ) : (
        <div
          className="flex size-full items-center justify-center px-3 py-2 text-center"
          style={{ backgroundColor: tint.bg, color: tint.text }}
        >
          {hideName ? null : (
            <span
              className="font-medium [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] overflow-hidden"
              style={{ fontSize: placeholderFontSize(name), lineHeight: 1.25 }}
            >
              {name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
