import Link from "next/link";
import { Badge } from "@/components/fluent";
import { ChevronRight, Location, Money, Timer } from "@/components/icons";
import { TopicIcon } from "@/components/ui/topic-icon";
import type { StudyStatus } from "@/lib/types";

/** A study as the public listing shows it. */
export interface StudyCardStudy {
  id: string;
  title: string;
  shortDescription: string;
  compensation: string;
  durationMinutes: number;
  location: string;
  tags: string[];
  status: StudyStatus;
}

interface StudyCardProps {
  study: StudyCardStudy;
  /** Open sessions, or null where the listing cannot count them. */
  openSlots: number | null;
}

/*
 * Promo-card frame (Figma): 402 wide · 10px radius · 17px inset
 *   image 368×202 (radius 10) · title 20/24 · body 15/18 · link rows 15/18 with chevron
 */
export function StudyCard({ study, openSlots }: StudyCardProps) {
  const href = `/studies/${study.id}`;
  const lead = study.tags[0];

  return (
    <article className="flex h-full w-[402px] max-w-full flex-col rounded-[10px] border border-stroke-2 bg-bg-1 p-[17px] shadow-2 transition-shadow duration-200 ease-[var(--ease-fluent-decel)] hover:shadow-8">
      {/* Image slot — a tinted panel until studies carry artwork */}
      <div
        aria-hidden="true"
        className="relative flex h-[202px] items-end overflow-hidden rounded-[10px] bg-[linear-gradient(135deg,var(--color-brand-tint-2),var(--color-brand-tint))] p-4"
      >
        {lead && (
          <span className="absolute right-4 top-4 text-brand/60 [&>svg]:size-16">
            <TopicIcon topic={lead} size={64} />
          </span>
        )}
        <div className="flex flex-wrap gap-1.5">
          {study.tags.map((tag) => (
            <Badge key={tag} tone="brand" size="sm" icon={<TopicIcon topic={tag} size={12} />}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <h2 className="mt-5 text-[20px] font-medium leading-6 text-fg-1">
        <Link href={href} className="rounded-xs hover:underline focus-ring">
          {study.title}
        </Link>
      </h2>

      <p className="mt-3 text-[15px] leading-[18px] text-black/75">{study.shortDescription}</p>

      <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-[18px] text-fg-3">
        <div className="flex items-center gap-1">
          <Timer size={14} />
          <dd>{study.durationMinutes} min</dd>
        </div>
        <div className="flex items-center gap-1">
          <Money size={14} />
          <dd>{study.compensation}</dd>
        </div>
        <div className="flex items-center gap-1">
          <Location size={14} />
          <dd>{study.location}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-col gap-3 pt-5">
        <Link href={href} className="inline-flex w-fit items-center gap-0.5 rounded-xs text-[15px] font-medium leading-[18px] text-link hover:underline focus-ring">
          View study <ChevronRight size={16} />
        </Link>
        {openSlots === null ? (
          <Link
            href={`${href}#book`}
            className="inline-flex w-fit items-center gap-0.5 rounded-xs text-[15px] font-medium leading-[18px] text-link hover:underline focus-ring"
          >
            See available sessions <ChevronRight size={16} />
          </Link>
        ) : openSlots > 0 ? (
          <Link
            href={`${href}#book`}
            className="inline-flex w-fit items-center gap-0.5 rounded-xs text-[15px] font-medium leading-[18px] text-link hover:underline focus-ring"
          >
            Book a session · {openSlots} open <ChevronRight size={16} />
          </Link>
        ) : (
          <span className="text-[15px] leading-[18px] text-fg-3">No open sessions right now</span>
        )}
      </div>
    </article>
  );
}
