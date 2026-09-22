-- Smart Pricing approvals — an audit trail of every monthly discount
-- recommendation an admin has reviewed, whether generated from synthetic
-- data (no real venue yet) or, later, from real per-venue history.
--
-- Unlike `venues`, this table is admin-only: no RLS policies are granted to
-- anon/authenticated, so the only way in is through the requireAdmin-gated
-- server functions in src/lib/smartPricing/pricing.functions.ts, which use
-- the service-role client (bypasses RLS by design, not by an open policy).
CREATE TABLE public.pricing_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  -- Free-text label for recommendations not tied to a real venue row yet
  -- (e.g. "demo: restaurant archetype") — venue_id is null in that case.
  venue_label TEXT NOT NULL,
  for_month TEXT NOT NULL,
  months_of_history INTEGER NOT NULL DEFAULT 0,
  hours JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  decided_by TEXT,
  decided_at TIMESTAMPTZ
);

ALTER TABLE public.pricing_recommendations ENABLE ROW LEVEL SECURITY;

CREATE INDEX pricing_recommendations_venue_idx ON public.pricing_recommendations(venue_id);
CREATE INDEX pricing_recommendations_created_at_idx ON public.pricing_recommendations(created_at DESC);
