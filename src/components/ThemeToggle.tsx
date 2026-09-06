import { Moon, Sun } from "lucide-react";
import { type Theme } from "@/lib/theme";

type Props = { theme: Theme; onToggle: () => void };

export function ThemeToggle({ theme, onToggle }: Props) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? "מצב יום" : "מצב לילה"}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--brand-navy)] shadow-[var(--shadow-float)] ring-1 ring-black/5 transition active:scale-95"
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
