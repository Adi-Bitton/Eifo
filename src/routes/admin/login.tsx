import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "כניסת ניהול — Eifo" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[var(--map-bg)] px-4"
    >
      <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-float)] ring-1 ring-black/5">
        <h1 className="text-lg font-extrabold text-[var(--brand-navy)]">כניסת ניהול</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          רק כתובות מייל מורשות (Adi + השותף) יכולות להיכנס.
        </p>

        {sent ? (
          <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            נשלח קישור התחברות ל-{email} — תפתחי אותו מהמייל כדי להיכנס.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--brand-pink)]"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-xl bg-[image:var(--gradient-brand)] py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? "שולח..." : "שלח קישור התחברות"}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
