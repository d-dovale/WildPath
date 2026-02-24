"""
MoveBank API client.
Docs: https://github.com/movebank/movebank-api-doc
"""

import os
import requests
import pandas as pd
from io import StringIO

MOVEBANK_BASE_URL = "https://www.movebank.org/movebank/service/direct-read"


def _get_auth() -> tuple[str, str]:
    return os.environ["MOVEBANK_USERNAME"], os.environ["MOVEBANK_PASSWORD"]


def get_animals(study_id: int) -> pd.DataFrame:
    """Fetch individual (animal) metadata for a study."""
    # TODO: implement
    raise NotImplementedError


def get_events(study_id: int) -> pd.DataFrame:
    """Fetch GPS tracking events for a study."""
    # TODO: implement
    raise NotImplementedError
