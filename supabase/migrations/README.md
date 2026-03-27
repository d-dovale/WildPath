# Supabase Migration Run Order

Run the following files in Supabase SQL Editor, in order:

1. `001_init_core_tables.sql`
2. `002_add_core_indexes.sql`
3. `003_seed_species_test_data.sql`
4. `004_add_updated_at_triggers.sql`
5. `005_add_trgm_indexes_for_search.sql`
6. `006_restore_species_btree_indexes.sql`
7. `007_add_trgm_indexes_on_species_columns.sql`
8. `008_seed_sightings_test_data.sql`

## Quick Validation Queries

```sql
select count(*) from public.species;
select common_name, scientific_name from public.species order by common_name;
```

Expected: at least 5 seeded species rows.
