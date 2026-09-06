
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS deals jsonb DEFAULT '[]'::jsonb;
