import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VenuesAdmin } from "@/components/admin/VenuesAdmin";
import { PricingAdmin } from "@/components/admin/PricingAdmin";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "ניהול — Eifo" }] }),
  component: AdminDashboard,
});

type AuthStatus = "checking" | "signed-in" | "signed-out";

function AdminDashboard() {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<"venues" | "pricing">("venues");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setEmail(data.session.user.email ?? null);
        setStatus("signed-in");
      } else {
        setStatus("signed-out");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setEmail(session.user.email ?? null);
        setStatus("signed-in");
      } else {
        setStatus("signed-out");
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status === "signed-out") window.location.href = "/admin/login";
  }, [status]);

  if (status !== "signed-in") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        טוען...
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--map-bg)] pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[var(--surface)]/95 px-5 py-4 shadow-sm backdrop-blur">
        <div>
          <h1 className="text-base font-extrabold text-[var(--brand-navy)]">ניהול איפה</h1>
          <p className="text-xs text-muted-foreground">מחוברת כ-{email}</p>
        </div>
        <button
          onClick={() =>
            supabase.auth.signOut().then(() => (window.location.href = "/admin/login"))
          }
          className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-[var(--brand-navy)]"
        >
          התנתקות
        </button>
      </header>

      <nav className="flex gap-2 px-5 py-3">
        <TabButton active={tab === "venues"} onClick={() => setTab("venues")}>
          מקומות
        </TabButton>
        <TabButton active={tab === "pricing"} onClick={() => setTab("pricing")}>
          תמחור חכם
        </TabButton>
      </nav>

      <main className="px-5">{tab === "venues" ? <VenuesAdmin /> : <PricingAdmin />}</main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors " +
        (active
          ? "bg-[var(--brand-navy)] text-white"
          : "bg-[var(--surface)] text-[var(--brand-navy)] ring-1 ring-black/10")
      }
    >
      {children}
    </button>
  );
}
