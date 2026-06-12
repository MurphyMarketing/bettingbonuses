import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocalDateTime } from '@/components/local-datetime';
import { daysUntil, type EventTimeStatus } from '@/lib/event-time';

export type HomeEvent = {
  name: string;
  slug: string;
  startsAt: Date | null;
  location: string | null;
  status: EventTimeStatus;
  offerCount: number;
};

/** Homepage "live and upcoming" event card — whole card links to the event's
 *  evergreen page; shows a status badge, the date/location, and an offers hook. */
export function EventCard({ event, now }: { event: HomeEvent; now: Date }) {
  const live = event.status === 'current';
  const days = event.startsAt ? daysUntil(event.startsAt, now) : 0;
  const statusLabel = live ? 'Live now' : days > 0 ? `In ${days} day${days === 1 ? '' : 's'}` : 'Starting soon';

  return (
    <Link href={`/${event.slug}/`} className="group">
      <Card className="flex h-full flex-col gap-2 p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{event.name}</span>
          <Badge variant={live ? 'default' : 'secondary'}>{statusLabel}</Badge>
        </div>

        {event.startsAt ? (
          <span className="text-sm text-muted-foreground">
            <LocalDateTime
              iso={event.startsAt.toISOString()}
              fallback={event.startsAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            />
          </span>
        ) : null}

        {event.location ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {event.location}
          </span>
        ) : null}

        <span className="mt-auto pt-1 text-sm font-medium text-primary group-hover:underline">
          {event.offerCount > 0 ? `${event.offerCount} offer${event.offerCount === 1 ? '' : 's'} →` : 'See event →'}
        </span>
      </Card>
    </Link>
  );
}
