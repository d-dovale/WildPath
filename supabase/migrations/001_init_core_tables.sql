-- WildPath core schema (ERD-aligned)
-- Run this first in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.studies (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id integer,
  name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  scientific_name text not null unique,
  common_name text not null,
  conservation_status text,
  description text,
  habitat text,
  fun_facts jsonb,
  population_estimate text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species(id) on delete restrict,
  study_id uuid references public.studies(id) on delete set null,
  movebank_id text unique,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  "timestamp" timestamptz not null,
  latitude numeric not null,
  longitude numeric not null,
  created_at timestamptz not null default now()
);
