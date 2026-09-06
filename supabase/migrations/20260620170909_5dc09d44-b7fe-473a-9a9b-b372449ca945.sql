CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  category TEXT,
  area TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  rating NUMERIC,
  review_count INTEGER,
  phone_number TEXT,
  navigation_url TEXT,
  reservation_url TEXT,
  instagram_url TEXT,
  google_reviews_url TEXT,
  website_url TEXT,
  deal_days TEXT[] DEFAULT '{}',
  deal_start_time TEXT,
  deal_end_time TEXT,
  is_all_day BOOLEAN DEFAULT false,
  deal_description TEXT,
  price_range TEXT,
  notes TEXT,
  verified_status TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published venues"
  ON public.venues FOR SELECT
  USING (is_published = true);

CREATE POLICY "Anyone can insert venues"
  ON public.venues FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update venues"
  ON public.venues FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX venues_is_published_idx ON public.venues(is_published);