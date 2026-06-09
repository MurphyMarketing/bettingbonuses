'use client';

import { useEffect, useState } from 'react';

/**
 * Renders a timestamp in the visitor's local timezone. The server emits a stable
 * fallback (so SSR/ISR output is deterministic); the client upgrades it to local
 * time after mount. suppressHydrationWarning covers the expected text swap.
 */
export function LocalDateTime({
  iso,
  fallback,
  dateStyle = 'full',
  timeStyle = 'short',
}: {
  iso: string;
  fallback: string;
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
  timeStyle?: Intl.DateTimeFormatOptions['timeStyle'];
}) {
  const [text, setText] = useState(fallback);
  useEffect(() => {
    setText(new Date(iso).toLocaleString(undefined, { dateStyle, timeStyle }));
  }, [iso, dateStyle, timeStyle]);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
