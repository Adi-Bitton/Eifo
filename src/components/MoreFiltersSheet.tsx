import { X } from "lucide-react";
import { SECONDARY_TAG_GROUPS } from "@/lib/secondaryTags";

type Props = {
  open: boolean;
  onClose: () => void;
  active: Set<string>;
  onToggle: (tag: string) => void;
  onClear: () => void;
};

export function MoreFiltersSheet({
  open,
  onClose,
  active,
  onToggle,
  onClear,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-[1000] flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/10" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[var(--brand-navy)]">
            עוד סינונים
          </h3>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-[var(--brand-navy)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {SECONDARY_TAG_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => {
                  const isActive = active.has(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => onToggle(tag)}
                      className={
                        "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition active:scale-95 " +
                        (isActive
                          ? "bg-[image:var(--gradient-brand)] text-white ring-transparent"
                          : "bg-white text-[var(--brand-navy)] ring-black/10")
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={onClear}
            className="flex-1 rounded-2xl bg-black/5 py-3 text-sm font-bold text-[var(--brand-navy)]"
          >
            נקה
          </button>
          <button
            onClick={onClose}
            className="flex-[2] rounded-2xl bg-[image:var(--gradient-brand)] py-3 text-sm font-bold text-white"
          >
            הצג תוצאות
          </button>
        </div>
      </div>
    </div>
  );
}
