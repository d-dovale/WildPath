-- Change source_id from integer to bigint to support large MoveBank study IDs
alter table public.studies
  alter column source_id type bigint;
