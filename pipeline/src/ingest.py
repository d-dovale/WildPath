"""
Main ingestion runner.

Usage:
    python src/ingest.py
"""

import logging
import os
import sys

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

from movebank import get_gps_studies, get_study, get_animals, get_events
from transform import extract_species, normalize_animals, normalize_events

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

BATCH_SIZE = 500


def _get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def upsert_batch(
    supabase: Client,
    table: str,
    rows: list[dict],
    conflict_columns: str,
    *,
    ignore_duplicates: bool = False,
) -> int:
    """Upsert rows into a Supabase table in batches.

    Returns total number of rows upserted.
    """
    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table(table).upsert(
            batch,
            on_conflict=conflict_columns,
            ignore_duplicates=ignore_duplicates,
        ).execute()
        total += len(batch)
        logger.info("  %s: upserted batch %d-%d", table, i, i + len(batch))
    return total


def _build_species_lookup(supabase: Client, scientific_names: list[str]) -> dict[str, str]:
    """Query species table and return {scientific_name: species_id} mapping."""
    response = (
        supabase.table("species")
        .select("id, scientific_name")
        .in_("scientific_name", scientific_names)
        .execute()
    )
    return {row["scientific_name"]: row["id"] for row in response.data}


def _build_animal_lookup(supabase: Client, movebank_ids: list[str]) -> dict[str, str]:
    """Query animals table and return {movebank_id: animal_id} mapping."""
    response = (
        supabase.table("animals")
        .select("id, movebank_id")
        .in_("movebank_id", movebank_ids)
        .execute()
    )
    return {row["movebank_id"]: row["id"] for row in response.data}


def run(study_id: int) -> None:
    """Full ingestion pipeline for a single MoveBank study."""
    supabase = _get_supabase()

    # 1. Fetch and upsert study metadata
    logger.info("Fetching study %d metadata...", study_id)
    study_meta = get_study(study_id)
    study_row = {
        "source": "movebank",
        "source_id": study_meta["source_id"],
        "name": study_meta["name"],
        "description": study_meta["description"],
    }
    supabase.table("studies").upsert(
        study_row, on_conflict="source,source_id"
    ).execute()

    # Retrieve the study UUID
    study_resp = (
        supabase.table("studies")
        .select("id")
        .eq("source", "movebank")
        .eq("source_id", study_meta["source_id"])
        .execute()
    )
    study_uuid = study_resp.data[0]["id"]
    logger.info("Study UUID: %s", study_uuid)

    # 2. Fetch animals
    logger.info("Fetching animals for study %d...", study_id)
    raw_animals = get_animals(study_id)
    if raw_animals.empty:
        logger.warning("No animals found — skipping study %d", study_id)
        return

    # 3. Extract and upsert species
    species_df = extract_species(raw_animals)
    if not species_df.empty:
        species_rows = species_df.to_dict(orient="records")
        upsert_batch(supabase, "species", species_rows, "scientific_name")
    logger.info("Species upserted: %d", len(species_df))

    # Build species lookup
    scientific_names = species_df["scientific_name"].tolist()
    species_lookup = _build_species_lookup(supabase, scientific_names)

    # 4. Normalize and upsert animals
    animals_df = normalize_animals(raw_animals)
    animal_rows = []
    for _, row in animals_df.iterrows():
        species_id = species_lookup.get(row["taxon_canonical_name"])
        if species_id is None:
            logger.warning(
                "Skipping animal %s — no species match for '%s'",
                row["movebank_id"],
                row["taxon_canonical_name"],
            )
            continue
        animal_rows.append({
            "movebank_id": row["movebank_id"],
            "name": row["name"] if pd.notna(row["name"]) else None,
            "species_id": species_id,
            "study_id": study_uuid,
        })

    if animal_rows:
        upsert_batch(supabase, "animals", animal_rows, "movebank_id")
    logger.info("Animals upserted: %d", len(animal_rows))

    # Build animal lookup
    movebank_ids = [r["movebank_id"] for r in animal_rows]
    animal_lookup = _build_animal_lookup(supabase, movebank_ids)

    # 5. Fetch events
    logger.info("Fetching events for study %d...", study_id)
    raw_events = get_events(study_id)
    if raw_events.empty:
        logger.warning("No events found for study %d", study_id)
        return

    # 6. Normalize and upsert sightings
    events_df = normalize_events(raw_events)

    sighting_rows = []
    skipped = 0
    for _, row in events_df.iterrows():
        animal_id = animal_lookup.get(row["movebank_individual_id"])
        if animal_id is None:
            skipped += 1
            continue
        sighting_rows.append({
            "animal_id": animal_id,
            "timestamp": row["timestamp"],
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
        })

    if skipped > 0:
        logger.warning("Skipped %d events with no matching animal", skipped)

    if sighting_rows:
        upsert_batch(
            supabase,
            "sightings",
            sighting_rows,
            "animal_id,timestamp",
            ignore_duplicates=True,
        )

    logger.info(
        "Study %d complete — species: %d, animals: %d, sightings: %d",
        study_id,
        len(species_df),
        len(animal_rows),
        len(sighting_rows),
    )


if __name__ == "__main__":
    # Use MOVEBANK_STUDY_IDS env var if set, otherwise discover all GPS studies
    raw_ids = os.environ.get("MOVEBANK_STUDY_IDS", "").strip()

    if raw_ids:
        study_ids = [int(sid.strip()) for sid in raw_ids.split(",") if sid.strip()]
        logger.info("Using %d study IDs from env: %s", len(study_ids), study_ids)
    else:
        logger.info("No MOVEBANK_STUDY_IDS set — discovering all GPS studies...")
        studies_df = get_gps_studies()
        if studies_df.empty:
            logger.error("No GPS studies found. Check your MoveBank credentials.")
            sys.exit(1)
        study_ids = studies_df["id"].astype(int).tolist()
        logger.info("Discovered %d GPS studies", len(study_ids))

    for sid in study_ids:
        try:
            run(sid)
        except Exception:
            logger.exception("Failed to ingest study %d", sid)

    logger.info("Pipeline complete.")
