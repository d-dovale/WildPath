-- Trigram indexes for case-insensitive substring search on species names.
-- Required for ilike '%term%' queries to use an index rather than a full table scan.
-- Run after 002_add_core_indexes.sql.

create extension if not exists pg_trgm;

-- Drop btree indexes for name columns — trigram indexes cover search better.
drop index if exists public.idx_species_common_name;
drop index if exists public.idx_species_scientific_name;

-- GIN trigram indexes on lowercased name columns.
-- These support ilike '%term%' efficiently at scale.
create index if not exists idx_species_common_name_trgm
  on public.species
  using gin (lower(common_name) gin_trgm_ops);

create index if not exists idx_species_scientific_name_trgm
  on public.species
  using gin (lower(scientific_name) gin_trgm_ops);
