"""
MoveBank API client.
Docs: https://github.com/movebank/movebank-api-doc
"""

import hashlib
import logging
import os
import time

import pandas as pd
import requests
from io import StringIO

MOVEBANK_BASE_URL = "https://www.movebank.org/movebank/service/direct-read"
REQUEST_DELAY_SECONDS = 1

logger = logging.getLogger(__name__)


def _get_auth() -> tuple[str, str]:
    return os.environ["MOVEBANK_USERNAME"], os.environ["MOVEBANK_PASSWORD"]


def _request(params: dict, timeout: int = 300) -> pd.DataFrame:
    """Send a GET request to MoveBank and return parsed CSV as a DataFrame.

    Handles the license-acceptance flow (403 → md5 re-request) automatically.
    Sleeps after each request to respect rate limits (1 concurrent per IP).
    """
    auth = _get_auth()

    response = requests.get(
        MOVEBANK_BASE_URL,
        params=params,
        auth=auth,
        timeout=timeout,
    )

    # License acceptance: MoveBank returns 403 with license text
    if response.status_code == 403:
        license_text = response.text
        license_md5 = hashlib.md5(license_text.encode("utf-8")).hexdigest()
        logger.info("Accepting license for params %s (md5: %s)", params, license_md5)

        params_with_license = {**params, "license-md5": license_md5}
        response = requests.get(
            MOVEBANK_BASE_URL,
            params=params_with_license,
            auth=auth,
            timeout=timeout,
        )

    response.raise_for_status()

    time.sleep(REQUEST_DELAY_SECONDS)

    text = response.text.strip()
    if not text:
        return pd.DataFrame()

    try:
        return pd.read_csv(StringIO(text))
    except Exception:
        logger.warning("Could not parse response as CSV; skipping. First 200 chars: %s", text[:200])
        return pd.DataFrame()


def get_gps_studies() -> pd.DataFrame:
    """Fetch all studies that use GPS sensors and are accessible to this account.

    MoveBank sensor_type_id 653 = GPS.
    Returns DataFrame with columns: id, name, acknowledgements
    """
    df = _request({
        "entity_type": "study",
        "sensor_type_id": 653,
        "attributes": "id,name,acknowledgements",
    })

    if df.empty:
        logger.warning("No GPS studies found")
        return df

    logger.info("Found %d GPS studies on MoveBank", len(df))
    return df


def get_study(study_id: int) -> dict:
    """Fetch study metadata. Returns dict with source_id, name, description."""
    df = _request({
        "entity_type": "study",
        "study_id": study_id,
        "attributes": "id,name,acknowledgements",
    })

    if df.empty:
        raise ValueError(f"Study {study_id} not found on MoveBank")

    row = df.iloc[0]
    return {
        "source_id": int(row["id"]),
        "name": str(row.get("name", "")),
        "description": str(row.get("acknowledgements", "")),
    }


def get_animals(study_id: int) -> pd.DataFrame:
    """Fetch individual (animal) metadata for a study.

    Returns DataFrame with columns: id, local_identifier, taxon_canonical_name
    """
    df = _request({
        "entity_type": "individual",
        "study_id": study_id,
        "attributes": "id,local_identifier,taxon_canonical_name",
    })

    if df.empty:
        logger.warning("No animals found for study %d", study_id)

    return df


def get_events(study_id: int, max_events_per_individual: int = 10000) -> pd.DataFrame:
    """Fetch GPS tracking events for a study.

    Returns DataFrame with columns: individual_id, timestamp, location_lat, location_long
    """
    params = {
        "entity_type": "event",
        "study_id": study_id,
        "attributes": "individual_id,timestamp,location_lat,location_long",
        "max_events_per_individual": max_events_per_individual,
    }

    df = _request(params, timeout=600)

    if df.empty:
        logger.warning("No events found for study %d", study_id)

    return df
