import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Brand star rating — part of the OfferCard's brand anchor.
 *
 * RESERVED SLOT: there is no rating field in the schema yet (owner decision —
 * build the component, wire the data later). Until a `rating` value is supplied
 * this renders `null`, so the card lays out correctly today and lights up with
 * zero further card changes once `brands.rating` exists and gets threaded
 * through the offer-card query.
 *
 * `rating` is on a 0–5 scale (supports halves visually). `reviewCount` is
 * optional supporting context.
 */
export function BrandRating({
  rating,
  reviewCount,
  className,
}: {
  rating?: number | null
  reviewCount?: number | null
  className?: string
}) {
  if (rating == null || rating <= 0) return null

  const clamped = Math.min(5, Math.max(0, rating))
  const rounded = Math.round(clamped * 2) / 2 // nearest half

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Rated ${clamped.toFixed(1)} out of 5${reviewCount ? ` from ${reviewCount} reviews` : ""}`}
    >
      <div className="flex" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.min(1, Math.max(0, rounded - i)) // 0, 0.5, or 1
          return (
            <span key={i} className="relative inline-block size-3.5">
              <Star className="absolute inset-0 size-3.5 text-foreground/15" />
              {fill > 0 ? (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className="size-3.5 fill-action text-action" />
                </span>
              ) : null}
            </span>
          )
        })}
      </div>
      <span className="text-xs font-semibold text-foreground/80">{clamped.toFixed(1)}</span>
      {reviewCount ? (
        <span className="text-xs text-muted-foreground">({reviewCount.toLocaleString("en-US")})</span>
      ) : null}
    </div>
  )
}
