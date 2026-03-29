# WildPath API Contract

Base URL in development: `http://localhost:3001`. All API routes live under `/api`.

---

## GET /api/animals

**Purpose:** List species for the animal selector and search.

**Query parameters:**

| Name   | Type   | Required | Description                                                                 |
|--------|--------|----------|-----------------------------------------------------------------------------|
| `q`    | string | No       | Search string; filter by `common_name` or `scientific_name` (case-insensitive). |
| `limit`| number | No       | Max results to return. Default: 20. Use 20–50 for search dropdown performance. |

**Response:** `200 OK`

Body: array of objects:

| Field             | Type   | Description                                                |
|-------------------|--------|------------------------------------------------------------|
| `id`              | UUID   | Species primary key (`species.id`); use as `speciesId` on map APIs |
| `common_name`     | string | Common name                                                |
| `scientific_name` | string | Scientific name                                            |

**Example request:**

```
GET /api/animals?q=wolf&limit=20
```

**Example response:**

```json
[
  { "id": "550e8400-e29b-41d4-a716-446655440000", "common_name": "Gray Wolf", "scientific_name": "Canis lupus" },
  { "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "common_name": "Red Wolf", "scientific_name": "Canis rufus" }
]
```

---

## GET /api/sightings

**Purpose:** Fetch sighting locations for the map (markers and movement paths) with optional filters.

**Query parameters:**

| Name        | Type   | Required | Description                                                                 |
|-------------|--------|----------|-----------------------------------------------------------------------------|
| `speciesId` | UUID   | No       | Filter sightings to animals of **this species** — UUID from `/api/animals` `id` (`species.id`). Omit to include all species (within bbox/time/`limit`). |
| `bbox`      | string | No       | Bounding box: `minLng,minLat,maxLng,maxLat` (e.g. `-122.5,37.7,-122.3,37.9`). |
| `start`     | string | No       | Start of time range (ISO date or datetime, e.g. `2024-01-01` or `2024-01-01T00:00:00.000Z`). |
| `end`       | string | No       | End of time range (ISO date or datetime).                                  |
| `limit`     | number | No       | Max rows returned. Default: 1000; capped at 5000.                            |

**Response:** `200 OK`

Body: array of objects:

| Field        | Type    | Description          |
|--------------|---------|----------------------|
| `id`         | UUID    | Sighting primary key |
| `animal_id`  | UUID    | FK to animals.id     |
| `latitude`   | number  | Latitude             |
| `longitude`  | number  | Longitude            |
| `timestamp`  | string  | ISO datetime (UTC)   |

**Example request:**

```
GET /api/sightings?speciesId=550e8400-e29b-41d4-a716-446655440000&bbox=-10,35,10,55&limit=1000
```

**Example response:**

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "animal_id": "22222222-0000-0000-0000-000000000001",
    "latitude": 45.5,
    "longitude": -122.6,
    "timestamp": "2024-03-15T14:30:00.000Z"
  }
]
```

---

## GET /api/insights

**Purpose:** Simple statistics for the current filter set (for the insights panel). Uses the same filters as `/api/sightings`; no `limit` (returns aggregates, not raw rows).

**Query parameters:** Same as `/api/sightings` — `speciesId`, `bbox`, `start`, `end`. Do **not** use `limit`.

**Response:** `200 OK`

Body: object:

| Field            | Type   | Description                                  |
|------------------|--------|----------------------------------------------|
| `totalSightings` | number | Total count of sightings matching the filters |
| `bySpecies`      | array  | `[{ animal_id (UUID), count (number) }]` — per tracked individual (`animals.id`), not per species row |
| `byDay`          | array  | `[{ date (string), count (number) }]` — UTC calendar date `YYYY-MM-DD` |

**Example request:**

```
GET /api/insights?speciesId=550e8400-e29b-41d4-a716-446655440000&start=2024-01-01&end=2024-12-31
```

**Example response:**

```json
{
  "totalSightings": 1250,
  "bySpecies": [
    { "animal_id": "22222222-0000-0000-0000-000000000001", "count": 800 }
  ],
  "byDay": [
    { "date": "2024-01-15", "count": 42 },
    { "date": "2024-01-16", "count": 38 }
  ]
}
```

---

## Future (not implemented)

**Use case:** A user searches “wolf” in the selector but does **not** pick a single species row. They want sightings for **every species** that matched the search (e.g. Gray Wolf and Red Wolf together), or a broader taxonomic group — not “one species” and not “everything in the viewport.”

**Not in the API today.** That would need something like:

- Multiple parallel requests per chosen UUID, or a multi-value param such as **`speciesIds`**
- A **`q` / search token** passed through to the backend so results match the same species set as the dropdown
- A taxonomy or **`species_group`** field on animals (see MVP schema notes) or similar grouping

Omitting `speciesId` on `/api/sightings` / `/api/insights` today means **no species filter**: all species in the bbox/time window (subject to row limits on `/api/sightings`), **not** “only species whose names matched wolf.”

---

## Error responses

Errors return a JSON object with an `error` (string) field and an appropriate HTTP status code:

- **400** — Bad request (e.g. invalid query parameters).
- **500** — Internal server error (e.g. database or server failure).

The global error handler (see `backend/src/middleware/errorHandler.ts`) returns a generic 500 and message when an unhandled error occurs.

**Example error response:**

```json
{ "error": "Invalid bbox format. Use minLng,minLat,maxLng,maxLat" }
```
