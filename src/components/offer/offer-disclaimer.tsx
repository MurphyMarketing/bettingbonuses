"use client"

import { useId } from "react"
import { Info } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * The offer's terms/disclaimer affordance. Legally the terms must be presented
 * WITH the offer, but they should not dominate the card — so the full text lives
 * behind a clearly-labelled "Terms" control that:
 *
 *  - opens on HOVER (desktop) via openOnHover, and on CLICK/TAP (mobile) and
 *    ENTER/SPACE (keyboard) because the trigger is a real <button>; ESC closes it.
 *  - is screen-reader reachable: the full text is always in the DOM in an
 *    sr-only node referenced by `aria-describedby`, so it is announced on focus
 *    even if JS/popover never runs — this is the accessible, no-JS fallback.
 *
 * Text is pre-resolved by the three-tier fallback in lib/disclaimer.ts, so this
 * component always receives a non-empty string.
 */
export function OfferDisclaimer({ text, className }: { text: string; className?: string }) {
  const id = useId()
  return (
    <>
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={120}
          closeDelay={80}
          aria-describedby={id}
          aria-label="Offer terms and conditions"
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action aria-expanded:text-foreground",
            className
          )}
        >
          <Info className="size-3.5" aria-hidden="true" />
          Terms
        </PopoverTrigger>
        <PopoverContent>
          <p className="mb-1 text-[0.7rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Offer terms
          </p>
          <p className="text-popover-foreground/90">{text}</p>
        </PopoverContent>
      </Popover>
      {/* Always-present accessible fallback (announced via aria-describedby; also
          guarantees the terms are in the DOM with no JS). */}
      <span id={id} className="sr-only">
        {text}
      </span>
    </>
  )
}
