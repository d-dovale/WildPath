-- Seed data for testing GET /api/sightings
-- Inserts 1 study, 3 animals (Gray Wolf, Bald Eagle, Jaguar), and 15 sightings.
-- Sightings are spread across different timestamps, lat/lng, and animals
-- to exercise speciesId, bbox, start/end, and limit filters.
-- Run after 003_seed_species_test_data.sql.
--
-- Test-only seed: remove or replace when the MoveBank pipeline is live.
-- Uses fixed UUIDs and ON CONFLICT (id) DO NOTHING for reruns. If another row
-- already exists with the same movebank_id but a different id, inserts can fail
-- on the animals.movebank_id unique constraint — expected only on dirty/non-dev DBs.

-- Study
insert into public.studies (id, source, source_id, name)
values (
  '11111111-0000-0000-0000-000000000001',
  'movebank',
  9001,
  'WildPath Test Study'
)
on conflict (id) do nothing;

-- Animals (linked to seeded species from 003)
insert into public.animals (id, species_id, study_id, movebank_id, name)
select
  '22222222-0000-0000-0000-000000000001',
  s.id,
  '11111111-0000-0000-0000-000000000001',
  'mb-wolf-001',
  'Wolf Alpha'
from public.species s where s.scientific_name = 'Canis lupus'
on conflict (id) do nothing;

insert into public.animals (id, species_id, study_id, movebank_id, name)
select
  '22222222-0000-0000-0000-000000000002',
  s.id,
  '11111111-0000-0000-0000-000000000001',
  'mb-eagle-001',
  'Eagle Bravo'
from public.species s where s.scientific_name = 'Haliaeetus leucocephalus'
on conflict (id) do nothing;

insert into public.animals (id, species_id, study_id, movebank_id, name)
select
  '22222222-0000-0000-0000-000000000003',
  s.id,
  '11111111-0000-0000-0000-000000000001',
  'mb-jaguar-001',
  'Jaguar Charlie'
from public.species s where s.scientific_name = 'Panthera onca'
on conflict (id) do nothing;

-- Sightings (15 rows, varied animal/timestamp/lat/lng)
-- Gray Wolf (North America, January–March 2024)
insert into public.sightings (id, animal_id, "timestamp", latitude, longitude) values
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '2024-01-05T08:00:00Z',  48.2,  -110.5),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', '2024-01-20T14:30:00Z',  47.8,  -111.2),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', '2024-02-10T09:15:00Z',  49.1,  -109.8),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', '2024-03-01T11:00:00Z',  48.5,  -110.0),
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', '2024-03-22T07:45:00Z',  50.3,  -108.7)
on conflict (id) do nothing;

-- Bald Eagle (Pacific Northwest, February–April 2024)
insert into public.sightings (id, animal_id, "timestamp", latitude, longitude) values
  ('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000002', '2024-02-03T10:00:00Z',  47.6,  -122.3),
  ('33333333-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000002', '2024-02-18T13:20:00Z',  48.4,  -123.1),
  ('33333333-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000002', '2024-03-07T08:55:00Z',  46.9,  -121.8),
  ('33333333-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000002', '2024-04-01T15:10:00Z',  47.2,  -122.0),
  ('33333333-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000002', '2024-04-19T06:30:00Z',  49.0,  -124.5)
on conflict (id) do nothing;

-- Jaguar (South America, March–June 2024)
insert into public.sightings (id, animal_id, "timestamp", latitude, longitude) values
  ('33333333-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000003', '2024-03-12T11:00:00Z',  -3.5,  -62.0),
  ('33333333-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000003', '2024-03-28T16:45:00Z',  -4.1,  -63.2),
  ('33333333-0000-0000-0000-000000000013', '22222222-0000-0000-0000-000000000003', '2024-04-15T09:00:00Z',  -2.8,  -61.5),
  ('33333333-0000-0000-0000-000000000014', '22222222-0000-0000-0000-000000000003', '2024-05-08T14:00:00Z',  -5.0,  -64.0),
  ('33333333-0000-0000-0000-000000000015', '22222222-0000-0000-0000-000000000003', '2024-06-01T07:20:00Z',  -3.2,  -62.8)
on conflict (id) do nothing;
