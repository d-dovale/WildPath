-- WildPath core indexes
-- Run after 001_init_core_tables.sql

create index if not exists idx_species_common_name
  on public.species(common_name);

create index if not exists idx_species_scientific_name
  on public.species(scientific_name);

create index if not exists idx_animals_species_id
  on public.animals(species_id);

create index if not exists idx_animals_study_id
  on public.animals(study_id);

create index if not exists idx_sightings_timestamp
  on public.sightings("timestamp");

create index if not exists idx_sightings_lat_lon
  on public.sightings(latitude, longitude);
