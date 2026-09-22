import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Server functions that only Eifo's own team should be able to call
 * (venue moderation, smart-pricing approvals) chain this in as
 * `.middleware([requireAdmin])`. It:
 *
 *  1. Reads the Supabase bearer token the client already attaches to every
 *     server-fn call (see auth-attacher.ts) and validates it.
 *  2. Checks the signed-in user's email against ADMIN_EMAILS — a plain
 *     server-only env var (comma-separated), never shipped to the client.
 *     Supabase itself allows anyone to sign in via magic link by default;
 *     this allowlist is what actually restricts admin access to us.
 */
function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const requireAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Set them in your .env file.",
    );
  }

  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: sign in at /admin/login");
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new Error("Unauthorized: sign in at /admin/login");
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Error("Unauthorized: invalid or expired session");
  }

  const email = (data.claims.email as string | undefined)?.toLowerCase();
  const allowed = getAdminEmails();
  if (allowed.length === 0) {
    throw new Error(
      "Admin access isn't configured yet: set ADMIN_EMAILS in .env to a comma-separated list of allowed emails.",
    );
  }
  if (!email || !allowed.includes(email)) {
    throw new Error("Forbidden: this account isn't an Eifo admin");
  }

  return next({ context: { adminEmail: email } });
});
