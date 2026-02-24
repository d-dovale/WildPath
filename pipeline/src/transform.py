"""
Data transformation layer.
Reshapes and cleans raw MoveBank data before loading into Supabase.
"""

import pandas as pd


def normalize_animals(animals_df: pd.DataFrame, study_id: int) -> pd.DataFrame:
    """Normalize raw MoveBank individuals into the Supabase animals table shape."""
    # TODO: implement
    raise NotImplementedError


def normalize_events(events_df: pd.DataFrame, animals_df: pd.DataFrame) -> pd.DataFrame:
    """Normalize raw MoveBank events into the Supabase sightings table shape."""
    # TODO: implement
    raise NotImplementedError
