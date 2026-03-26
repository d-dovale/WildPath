-- Restore btree indexes on species name columns.
-- Migration 005 dropped these in favour of trigram GIN indexes, but btree is
-- still needed for ORDER BY common_name (GIN indexes cannot support ordering).
-- Both index types should coexist: trigram for ilike '%term%' search,
-- btree for sorted listing and exact/range lookups.

create index if not exists idx_species_common_name
  on public.species(common_name);

create index if not exists idx_species_scientific_name
  on public.species(scientific_name);
