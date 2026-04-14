-- Add image_url and range columns to species table for enriched data from external APIs
ALTER TABLE public.species ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.species ADD COLUMN IF NOT EXISTS range TEXT;
ALTER TABLE public.species ADD COLUMN IF NOT EXISTS wikipedia_url TEXT;
