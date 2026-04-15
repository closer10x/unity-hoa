import { fetchPublishedCommunityEvents } from "@/lib/data/community-events";
import { EVENT_CATEGORY_LABELS, type EventCategory } from "@/lib/types/community";

function tagClassForCategory(category: EventCategory): string {
  switch (category) {
    case "official":
      return "text-on-primary-fixed-variant bg-primary-fixed px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-2 inline-block";
    case "social":
    case "wellness":
      return "text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-2 inline-block";
    default:
      return "text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-2 inline-block";
  }
}

function formatDayMon(iso: string): { day: string; mon: string } {
  const d = new Date(iso);
  return {
    day: String(d.getUTCDate()),
    mon: d
      .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
      .toUpperCase(),
  };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function CommunityEventsSection() {
  const result = await fetchPublishedCommunityEvents(12);

  if ("error" in result) {
    return (
      <div className="lg:col-span-2 space-y-4">
        <p className="text-sm text-on-surface-variant">
          Community events could not be loaded right now. Please try again later.
        </p>
      </div>
    );
  }

  const { items } = result;

  if (!items.length) {
    return (
      <div className="lg:col-span-2 space-y-4">
        <p className="text-sm text-on-surface-variant">
          No published community events yet. Admins can add events from the admin portal; they will
          appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 space-y-6">
      {items.map((e) => {
        const { day, mon } = formatDayMon(e.starts_at);
        const tagLabel = EVENT_CATEGORY_LABELS[e.category] ?? e.category;
        return (
          <div
            key={e.id}
            className="bg-surface-container-lowest p-6 rounded-lg flex gap-8 items-center transition-all hover:bg-white hover:shadow-[0_24px_48px_rgba(20,27,34,0.06)]"
          >
            <div className="shrink-0 text-center">
              <span className="block text-secondary font-extrabold text-2xl">{day}</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {mon}
              </span>
            </div>
            <div className="flex-grow min-w-0">
              <span className={tagClassForCategory(e.category)}>{tagLabel}</span>
              <h4 className="text-lg font-bold text-primary mb-1">{e.title}</h4>
              {e.description ? (
                <p className="text-sm text-on-surface-variant line-clamp-3">{e.description}</p>
              ) : null}
            </div>
            <div className="hidden md:block text-right shrink-0">
              <span className="block text-sm font-semibold text-primary">{formatTime(e.starts_at)}</span>
              <span className="text-xs text-on-surface-variant">
                {e.location?.trim() || "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
