-- Keep updated_at in sync on row updates.
-- Run after 001_init_core_tables.sql.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_studies_set_updated_at on public.studies;
create trigger trg_studies_set_updated_at
before update on public.studies
for each row
execute function public.set_updated_at();

drop trigger if exists trg_species_set_updated_at on public.species;
create trigger trg_species_set_updated_at
before update on public.species
for each row
execute function public.set_updated_at();

drop trigger if exists trg_animals_set_updated_at on public.animals;
create trigger trg_animals_set_updated_at
before update on public.animals
for each row
execute function public.set_updated_at();
