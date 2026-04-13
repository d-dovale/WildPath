"""
Data transformation layer.
Reshapes and cleans raw MoveBank data before loading into Supabase.
"""

import logging

import pandas as pd

logger = logging.getLogger(__name__)


def extract_species(animals_df: pd.DataFrame) -> pd.DataFrame:
    """Extract unique species from animal metadata.

    Returns DataFrame with columns: scientific_name, common_name
    MoveBank only provides scientific names, so common_name defaults to scientific_name.
    """
    if animals_df.empty or "taxon_canonical_name" not in animals_df.columns:
        return pd.DataFrame(columns=["scientific_name", "common_name"])

    species = (
        animals_df[["taxon_canonical_name"]]
        .dropna(subset=["taxon_canonical_name"])
        .drop_duplicates(subset=["taxon_canonical_name"])
        .rename(columns={"taxon_canonical_name": "scientific_name"})
    )

    species["scientific_name"] = species["scientific_name"].astype(str)
    species = species[species["scientific_name"].str.strip() != ""]
    species["common_name"] = species["scientific_name"]

    return species.reset_index(drop=True)


def normalize_animals(animals_df: pd.DataFrame) -> pd.DataFrame:
    """Normalize raw MoveBank individuals into the Supabase animals table shape.

    Returns DataFrame with columns: movebank_id, name, taxon_canonical_name
    The taxon_canonical_name is kept for FK resolution during upsert.
    """
    if animals_df.empty or "id" not in animals_df.columns:
        return pd.DataFrame(columns=["movebank_id", "name", "taxon_canonical_name"])

    result = animals_df.dropna(subset=["id"]).copy()

    result["movebank_id"] = result["id"].astype("int64").astype(str)
    result["name"] = result.get("local_identifier", pd.Series(dtype=str))
    result["taxon_canonical_name"] = result.get(
        "taxon_canonical_name", pd.Series(dtype=str)
    )
    # Fill missing species with "Unknown" so animals still get ingested
    result["taxon_canonical_name"] = result["taxon_canonical_name"].fillna("Unknown")

    return result[["movebank_id", "name", "taxon_canonical_name"]].reset_index(
        drop=True
    )


def normalize_events(events_df: pd.DataFrame) -> pd.DataFrame:
    """Normalize raw MoveBank events into the Supabase sightings table shape.

    Returns DataFrame with columns: movebank_individual_id, timestamp, latitude, longitude
    Drops rows with null/invalid coordinates or unparseable timestamps.
    """
    if events_df.empty:
        return pd.DataFrame(
            columns=["movebank_individual_id", "timestamp", "latitude", "longitude"]
        )

    result = events_df.copy()

    # Drop rows missing coordinates
    result = result.dropna(subset=["location_lat", "location_long"])

    # Validate coordinate ranges
    valid_lat = result["location_lat"].between(-90, 90)
    valid_lon = result["location_long"].between(-180, 180)
    invalid_count = (~(valid_lat & valid_lon)).sum()
    if invalid_count > 0:
        logger.warning("Dropping %d events with out-of-range coordinates", invalid_count)
    result = result[valid_lat & valid_lon]

    # Parse timestamps
    result["timestamp"] = pd.to_datetime(
        result["timestamp"], utc=True, errors="coerce"
    )
    nat_count = result["timestamp"].isna().sum()
    if nat_count > 0:
        logger.warning("Dropping %d events with unparseable timestamps", nat_count)
    result = result.dropna(subset=["timestamp"])

    # Rename to target schema
    result = result.rename(columns={
        "individual_id": "movebank_individual_id",
        "location_lat": "latitude",
        "location_long": "longitude",
    })

    # Drop rows with missing individual IDs before casting
    result = result.dropna(subset=["movebank_individual_id"])
    result["movebank_individual_id"] = result["movebank_individual_id"].astype("int64").astype(str)
    result["timestamp"] = result["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    return (
        result[["movebank_individual_id", "timestamp", "latitude", "longitude"]]
        .sort_values("timestamp")
        .reset_index(drop=True)
    )
