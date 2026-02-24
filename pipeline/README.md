# WildPath — Data Ingestion Pipeline

This Python pipeline fetches animal tracking data from the [MoveBank API](https://www.movebank.org/), processes it with pandas, and loads it into Supabase.

## Why Python?

MoveBank data has a variable schema (studies can have 5–200+ columns), uses long canonical attribute names, and typically requires merging two separate API calls (animal metadata + GPS events). Python and pandas handle this far more cleanly than Node.js.

## Setup

### 1. Create and activate a virtual environment (recommended)

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your credentials in `.env`:

| Variable               | Description                                        |
|------------------------|----------------------------------------------------|
| `SUPABASE_URL`         | Your Supabase project URL                          |
| `SUPABASE_SERVICE_KEY` | Supabase service role key                          |
| `MOVEBANK_USERNAME`    | MoveBank account username                          |
| `MOVEBANK_PASSWORD`    | MoveBank account password                          |
| `MOVEBANK_STUDY_IDS`   | Comma-separated MoveBank study IDs (e.g. `12345,67890`) |

> Register for a MoveBank account at https://www.movebank.org

## Running the Pipeline

```bash
python src/ingest.py
```

The pipeline will:
1. Fetch animal (individual) metadata for each study
2. Fetch GPS event records for each study
3. Normalize column names and parse timestamps
4. Upsert animals and sightings into Supabase in batches

## Module Overview

| File              | Purpose                                              |
|-------------------|------------------------------------------------------|
| `src/movebank.py` | MoveBank REST API client — fetches studies, animals, GPS events |
| `src/transform.py`| pandas transformations — renames columns, casts types, merges datasets |
| `src/ingest.py`   | Main runner — orchestrates fetch → transform → upsert |

## Notes

- MoveBank allows **one concurrent request per IP**. Do not run multiple instances simultaneously.
- Run this pipeline on a schedule (e.g. nightly cron) rather than on each user request.
- Large studies may contain millions of GPS events. The pipeline batches Supabase upserts in groups of 500 rows.
