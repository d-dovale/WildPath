-- Constraints required for idempotent pipeline upserts (re-running without duplicates).

-- Studies: allow ON CONFLICT (source, source_id) during upsert
create unique index if not exists idx_studies_source_source_id
  on public.studies (source, source_id);

-- Sightings: same animal at same timestamp = duplicate GPS fix
create unique index if not exists idx_sightings_animal_timestamp
  on public.sightings (animal_id, "timestamp");
