import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./adminAuth";

export type VenueAdminRow = {
  id: string;
  name: string;
  area: string | null;
  category: string | null;
  is_published: boolean;
  verified_status: string | null;
  created_at: string;
  deal_description: string | null;
};

/** Every venue, published or not — the public app only ever shows published ones. */
export const listVenuesAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<VenueAdminRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("venues" as never)
      .select("id,name,area,category,is_published,verified_status,created_at,deal_description")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as VenueAdminRow[];
  });

export const setVenuePublished = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({ id: z.string().min(1), isPublished: z.boolean() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("venues" as never)
      .update({ is_published: data.isPublished } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVenueAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("venues" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
