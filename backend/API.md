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

| Field             | Type   | Description        |
|-------------------|--------|--------------------|
| `id`              | UUID   | Animal primary key |
| `common_name`     | string | Common name        |
| `scientific_name` | string | Scientific name    |

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
| `speciesId` | UUID   | No       | Only return sightings for this animal.                                     |
| `bbox`      | string | No       | Bounding box: `minLng,minLat,maxLng,maxLat` (e.g. `-122.5,37.7,-122.3,37.9`). |
| `start`     | string | No       | Start of time range (ISO date or datetime, e.g. `2024-01-01` or `2024-01-01T00:00:00.000Z`). |
| `end`       | string | No       | End of time range (ISO date or datetime).                                  |
| `limit`     | number | No       | Max rows returned. Default: 5000.                                          |

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
    "animal_id": "550e8400-e29b-41d4-a716-446655440000",
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
| `bySpecies`      | array  | `[{ animal_id (UUID), count (number) }]`     |
| `byDay`          | array  | `[{ date (string), count (number) }]` for a simple trend (e.g. daily counts). |

**Example request:**

```
GET /api/insights?speciesId=550e8400-e29b-41d4-a716-446655440000&start=2024-01-01&end=2024-12-31
```

**Example response:**

```json
{
  "totalSightings": 1250,
  "bySpecies": [
    { "animal_id": "550e8400-e29b-41d4-a716-446655440000", "count": 1250 }
  ],
  "byDay": [
    { "date": "2024-01-15", "count": 42 },
    { "date": "2024-01-16", "count": 38 }
  ]
}
```

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
