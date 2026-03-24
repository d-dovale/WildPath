-- WildPath seed data for API testing
-- Run after 001/002 migrations.

insert into public.species (scientific_name, common_name, conservation_status, habitat)
values
  ('Canis lupus', 'Gray Wolf', 'Least Concern', 'Forests and tundra'),
  ('Ursus arctos', 'Brown Bear', 'Least Concern', 'Forests and mountains'),
  ('Haliaeetus leucocephalus', 'Bald Eagle', 'Least Concern', 'Near lakes and coasts'),
  ('Panthera onca', 'Jaguar', 'Near Threatened', 'Tropical forests'),
  ('Lynx lynx', 'Eurasian Lynx', 'Least Concern', 'Boreal and temperate forests')
on conflict (scientific_name) do update
set
  common_name = excluded.common_name,
  conservation_status = excluded.conservation_status,
  habitat = excluded.habitat;
