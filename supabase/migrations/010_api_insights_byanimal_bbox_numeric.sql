-- Renames JSON key bySpecies → byAnimal (grouped by animal_id, not species),
-- and fixes bbox comparisons to cast params to numeric instead of columns to
-- double precision (avoids index inhibition on numeric latitude/longitude columns).

create or replace function public.api_insights(
  p_species_id uuid default null,
  p_min_lng double precision default null,
  p_min_lat double precision default null,
  p_max_lng double precision default null,
  p_max_lat double precision default null,
  p_start timestamptz default null,
  p_end timestamptz default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with base as (
  select
    s.animal_id,
    s.timestamp as ts
  from public.sightings s
  inner join public.animals a on a.id = s.animal_id
  where (p_species_id is null or a.species_id = p_species_id)
    and (
      p_min_lng is null or p_min_lat is null or p_max_lng is null or p_max_lat is null
      or (
        s.longitude >= p_min_lng::numeric
        and s.longitude <= p_max_lng::numeric
        and s.latitude >= p_min_lat::numeric
        and s.latitude <= p_max_lat::numeric
      )
    )
    and (p_start is null or s.timestamp >= p_start)
    and (p_end is null or s.timestamp <= p_end)
)
select jsonb_build_object(
  'totalSightings', coalesce((select count(*)::bigint from base), 0),
  'byAnimal', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('animal_id', animal_id, 'count', cnt)
        order by cnt desc, animal_id
      )
      from (
        select animal_id, count(*)::bigint as cnt
        from base
        group by animal_id
      ) x
    ),
    '[]'::jsonb
  ),
  'byDay', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('date', day_str, 'count', cnt)
        order by day_str
      )
      from (
        select
          to_char((ts at time zone 'utc')::date, 'YYYY-MM-DD') as day_str,
          count(*)::bigint as cnt
        from base
        group by (ts at time zone 'utc')::date
      ) d
    ),
    '[]'::jsonb
  )
);
$$;

grant execute on function public.api_insights(
  uuid,
  double precision,
  double precision,
  double precision,
  double precision,
  timestamptz,
  timestamptz
) to service_role;

comment on function public.api_insights(
  uuid,
  double precision,
  double precision,
  double precision,
  double precision,
  timestamptz,
  timestamptz
) is
  'Returns JSON with totalSightings (bigint), byAnimal (animal_id/count per tracked individual), and byDay (YYYY-MM-DD/count in UTC) for optional species/bbox/time filters.';
