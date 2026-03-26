-- Trigram GIN indexes on plain species name columns (without lower()).
-- Migration 005 added trigram indexes on lower(common_name) / lower(scientific_name),
-- but Postgres only uses expression indexes when the query matches the same expression.
-- The API filters on common_name / scientific_name directly (via PostgREST ilike),
-- so these plain-column trigram indexes are needed for large-dataset performance.

create extension if not exists pg_trgm;

create index if not exists idx_species_common_name_trgm_plain
  on public.species
  using gin (common_name gin_trgm_ops);

create index if not exists idx_species_scientific_name_trgm_plain
  on public.species
  using gin (scientific_name gin_trgm_ops);
