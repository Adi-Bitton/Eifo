import { Clock, Navigation } from "lucide-react";

type Filter = "now" | "near";
type Props = { active: Filter; onChange: (f: Filter) => void };

export function QuickFilterChips({ active, onChange }: Props) {
  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute inset-x-0 z-[500] flex justify-center px-3"
      style={{ bottom: "calc(var(--bottom-card-h, 132px) + 16px)" }}
    >
      <div className="pointer-events-auto flex gap-2">
        <Chip
          active={active === "now"}
          onClick={() => onChange("now")}
          icon={<Clock className="h-4 w-4" />}
          label="קורה עכשיו"
        />
        <Chip
          active={active === "near"}
          onClick={() => onChange("near")}
          icon={<Navigation className="h-4 w-4" />}
          label="לידי"
        />
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold shadow-[var(--shadow-float)] ring-1 transition active:scale-95 " +
        (active
          ? "bg-[image:var(--gradient-brand)] text-white ring-transparent"
          : "bg-white text-[var(--brand-navy)] ring-black/5")
      }
    >
      {icon}
      {label}
    </button>
  );
}
