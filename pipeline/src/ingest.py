"""
Main ingestion runner.

Usage:
    python src/ingest.py
"""

import os
from dotenv import load_dotenv
from supabase import create_client

from movebank import get_animals, get_events
from transform import normalize_animals, normalize_events

load_dotenv()

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def run(study_id: int) -> None:
    # TODO: implement full ingestion flow
    print(f"Ingesting study {study_id}...")


if __name__ == "__main__":
    # TODO: read study IDs from env or CLI args
    print("No study IDs configured yet.")
