# WildPath

WildPath is an interactive wildlife exploration app that makes animal movement and biodiversity data easier to browse, understand, and compare. The project combines tracked animal sightings stored in Supabase with live GBIF occurrence data, then presents both through a map-based interface and a lightweight quiz experience.

## Core Features

- Interactive Explore page with Mapbox-based wildlife mapping
- Live GBIF species search and occurrence lookup
- Stored MoveBank tracking data shown as tracked-animal sightings
- Optional GBIF density heatmap for broader species coverage
- Time and visible-area filters
- MoveBank movement path visualization
- Animal ID quiz generated from species records with cached image enrichment

## Data Sources

- MoveBank: source for tracked-animal study, animal, and sighting data ingested into Supabase
- GBIF: live species search, species detail lookup, and occurrence mapping
- iNaturalist: enrichment for species images and conservation data
- Wikipedia: enrichment for species descriptions and fallback imagery

Important note: the current Python ingestion pipeline writes MoveBank data into the database. GBIF is used live through backend API routes rather than being ingested by the pipeline.

## Architecture

WildPath has three main layers:

1. `frontend/`: React + Vite client with Mapbox, filters, species cards, and quiz UI
2. `backend/`: Express + TypeScript API for species, sightings, insights, quiz, and GBIF endpoints
3. `pipeline/`: Python ingestion pipeline that imports MoveBank study data into Supabase

Persistent project data is stored in Supabase PostgreSQL. The frontend talks to the backend through `/api/*` routes, and the backend reads from Supabase plus external data providers.

## Current Database Model

The live schema in this repo is centered on these tables:

- `studies`: imported data-source studies, currently used for MoveBank studies
- `species`: species-level metadata and enriched fields such as `image_url`, `range`, and `wikipedia_url`
- `animals`: tracked individual animals linked to `species` and optionally `studies`
- `sightings`: timestamped latitude/longitude points linked to `animals`

Additional database details:

- `studies` has a unique upsert key on `(source, source_id)`
- `sightings` has a unique upsert key on `(animal_id, timestamp)`
- `api_insights` is a Supabase SQL function used by the backend for filtered map aggregates

Quiz questions are not stored in dedicated database tables in the current implementation. They are generated on demand from `species` rows that have images available or can be enriched at request time.

## API Summary

Main backend routes:

- `GET /api/species`: search local stored species
- `GET /api/species/:id`: fetch enriched stored-species detail
- `GET /api/sightings`: fetch MoveBank-backed tracked sightings
- `GET /api/insights`: fetch aggregate counts for the current filters
- `GET /api/quiz`: generate quiz questions from enriched species records
- `GET /api/gbif/search`: search GBIF species
- `GET /api/gbif/occurrences`: fetch GBIF occurrence points
- `GET /api/gbif/species/:key`: fetch GBIF species detail with enrichment
- `GET /health`: health check

Detailed route behavior is documented in [backend/API.md](backend/API.md).

## Project Structure

```text
WildPath/
|-- frontend/             # React + Vite client
|-- backend/              # Express + TypeScript API
|-- pipeline/             # Python MoveBank ingestion pipeline
|-- supabase/migrations/  # schema and SQL migration files
|-- docs/images/          # submission/reference images
|-- USER_MANUAL.md        # end-user documentation
`-- README.md             # project overview
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Map | Mapbox GL JS |
| State / Data Fetching | TanStack React Query |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase PostgreSQL |
| Pipeline | Python, pandas, Supabase Python SDK |
| External Data | MoveBank, GBIF, iNaturalist, Wikipedia |

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- pip
- Supabase project
- Mapbox token
- MoveBank account credentials

### Install dependencies

```bash
npm install
cd pipeline
pip install -r requirements.txt
```

### Configure environment variables

Copy the example files and update the values:

```bash
copy frontend\.env.example frontend\.env
copy backend\.env.example backend\.env
copy pipeline\.env.example pipeline\.env
```

If you are using macOS or Linux, replace `copy` with `cp`.

### Environment variables

`frontend/.env`

- `VITE_API_URL`: optional backend override for local development
- `VITE_MAPBOX_TOKEN`: Mapbox public token

`backend/.env`

- `PORT`: backend port, default `3001`
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `FRONTEND_ORIGIN`: exact frontend origin for CORS
- `ENABLE_SWAGGER_DOCS`: set `true` to expose `/docs` in development

`pipeline/.env`

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `MOVEBANK_USERNAME`: MoveBank username
- `MOVEBANK_PASSWORD`: MoveBank password
- `MOVEBANK_STUDY_IDS`: optional comma-separated study IDs to ingest

## Running Locally

Run both frontend and backend from the repo root:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:frontend
npm run dev:backend
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Swagger docs: `http://localhost:3001/docs` when `ENABLE_SWAGGER_DOCS=true`

## Running the MoveBank Pipeline

```bash
cd pipeline
python src/ingest.py
```

Pipeline behavior:

1. Fetch MoveBank study metadata
2. Fetch animals for each study
3. Resolve and upsert species
4. Upsert tracked animals
5. Fetch event records
6. Normalize and upsert sightings

Notes:

- MoveBank allows one concurrent request per IP
- The pipeline is intended for scheduled ingestion, not real-time user requests
- If `MOVEBANK_STUDY_IDS` is empty, the pipeline discovers GPS studies available to the configured account

## Deployment Notes

- Frontend production site: `https://wild-path-frontend-navy.vercel.app/`
- Frontend rewrites `/api/*` to the backend deployment using `frontend/vercel.json`
- Backend production CORS should set `FRONTEND_ORIGIN=https://wild-path-frontend-navy.vercel.app`
- Production frontend still requires `VITE_MAPBOX_TOKEN`

## Team

**Team DRAKKN**

- Daniel Dovale
- Kaitlyn Tran
- Arnav
- Ronald
- Kavi Patel
