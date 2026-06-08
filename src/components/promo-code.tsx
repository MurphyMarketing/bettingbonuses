'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/** Promo code chip with copy-to-clipboard. Client component so OfferCard can
 *  stay a server component. */
export function PromoCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy promo code ${code}`}
      className="inline-flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1 hover:bg-muted"
    >
      <span className="font-mono text-sm font-semibold tracking-wide">{code}</span>
      {copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Copy className="size-3.5 text-muted-foreground" />
      )}
      <span className="text-xs text-muted-foreground">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
