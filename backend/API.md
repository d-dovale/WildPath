# WildPath API Contract

Base URL in development: `http://localhost:3001`. All API routes live under `/api`.

---

## End-to-end flow (client)

Typical map + species-details + insights usage:

1. **`GET /api/species?q=...`** - User searches; each row's **`id`** is **`species.id`** (not an individual animal).
2. **Pick one species** - Store that **`id`** as the value for **`species_id`** on the next calls.
3. **`GET /api/species/:id`** - Fetch one species detail payload with normalized sidebar summary fields, API Ninjas facts, and one Pexels photo.
4. **`GET /api/sightings`** - Pass **`species_id`**, optional **`bbox`**, **`start`**, **`end`**, **`limit`**. Rows include **`animal_id`** (`animals.id`, the tracked individual) and coordinates for markers.
5. **`GET /api/insights`** - Use the **same** **`species_id`**, **`bbox`**, **`start`**, **`end`** as sightings (omit relying on **`limit`** for totals). Response: **`totalSightings`**, **`byAnimal`** (counts per **`animal_id`**), **`byDay`** (UTC dates).

Omitting **`species_id`** means no species filter (all species in bbox/time, subject to sightings **`limit`** on the list endpoint).

---

## GET /api/species

**Purpose:** List species for the animal selector and search.

**Query parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `q` | string | No | Search string; filter by `common_name` or `scientific_name` (case-insensitive). |
| `limit` | number | No | Max results to return. Default: 20. Use 20-50 for search dropdown performance. |

**Response:** `200 OK`

Body: array of objects:

| Field | Type | Description |
|------|------|-------------|
| `id` | UUID | Species primary key (`species.id`); use as `species_id` on map APIs |
| `common_name` | string | Common name |
| `scientific_name` | string | Scientific name |

**Example request:**

```http
GET /api/species?q=wolf&limit=20
```

**Example response:**

```json
[
  { "id": "550e8400-e29b-41d4-a716-446655440000", "common_name": "Gray Wolf", "scientific_name": "Canis lupus" },
  { "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "common_name": "Red Wolf", "scientific_name": "Canis rufus" }
]
```

---

## GET /api/species/:id

**Purpose:** Fetch one species record with normalized sidebar-ready summary fields plus third-party enrichment.

**Path parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | UUID | Yes | Species primary key (`species.id`) from `GET /api/species`. |

**Response:** `200 OK`

Body: object

| Field | Type | Description |
|------|------|-------------|
| `id` | UUID | Species primary key |
| `common_name` | string | Common name from WildPath DB |
| `scientific_name` | string | Scientific name from WildPath DB |
| `description` | string or null | Local species description |
| `conservation_status` | string or null | Local conservation status |
| `habitat` | string or null | Local habitat |
| `fun_facts` | json or null | Local fun facts payload |
| `population_estimate` | string or null | Local population estimate |
| `summary` | object | Normalized fields for the sidebar card |
| `animal_info` | object or null | Normalized API Ninjas taxonomy, locations, and characteristics |
| `photo` | object or null | Primary Pexels image with attribution metadata |

`summary` fields:

| Field | Type | Description |
|------|------|-------------|
| `conservation_status.value` | string or null | Uses WildPath DB value only in v1 |
| `conservation_status.source` | string or null | `wildpath_db` when present |
| `habitat.value` | string or null | Prefers WildPath DB, falls back to API Ninjas |
| `habitat.source` | string or null | `wildpath_db` or `api_ninjas` |
| `range.value` | string or null | Derived from API Ninjas `locations` |
| `range.source` | string or null | `api_ninjas` when present |

**Example request:**

```http
GET /api/species/550e8400-e29b-41d4-a716-446655440000
```

**Example response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "common_name": "Bald Eagle",
  "scientific_name": "Haliaeetus leucocephalus",
  "description": null,
  "conservation_status": "Least Concern",
  "habitat": "Near water bodies",
  "fun_facts": null,
  "population_estimate": null,
  "summary": {
    "conservation_status": {
      "value": "Least Concern",
      "source": "wildpath_db"
    },
    "habitat": {
      "value": "Near water bodies",
      "source": "wildpath_db"
    },
    "range": {
      "value": "North America",
      "source": "api_ninjas"
    }
  },
  "animal_info": {
    "taxonomy": {
      "scientific_name": "Haliaeetus leucocephalus",
      "class": "Aves",
      "order": "Accipitriformes",
      "family": "Accipitridae",
      "genus": "Haliaeetus"
    },
    "locations": ["North America"],
    "characteristics": {
      "habitat": "Near water bodies",
      "diet": "Fish",
      "lifespan": "20 years",
      "weight": "3kg-6.3kg",
      "height": "70cm-102cm",
      "top_speed": "48km/h",
      "estimated_population_size": "Unknown",
      "biggest_threat": "Habitat loss"
    }
  },
  "photo": {
    "image_url": "https://images.pexels.com/photos/example/pexels-photo.jpeg",
    "alt": "Bald eagle flying over forest",
    "photographer": "Jane Doe",
    "photographer_url": "https://www.pexels.com/@janedoe",
    "pexels_url": "https://www.pexels.com/photo/example/",
    "source": "pexels"
  }
}
```

**Partial response behavior:** If API Ninjas or Pexels fails, the endpoint still returns `200 OK` with local species data and `null` for whichever enrichment block could not be fetched.

**Error responses:**

- `400` - `id` is not a valid UUID
- `404` - no species exists for that `id`
- `500` - internal server error

---

## GET /api/sightings

**Purpose:** Fetch sighting locations for the map (markers and movement paths) with optional filters.

**Query parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `species_id` | UUID | No | Filter sightings to animals of **this species** - UUID from `/api/species` `id` (`species.id`). Omit to include all species (within bbox/time/`limit`). |
| `bbox` | string | No | Bounding box: `minLng,minLat,maxLng,maxLat` (e.g. `-122.5,37.7,-122.3,37.9`). |
| `start` | string | No | Start of time range (ISO date or datetime, e.g. `2024-01-01` or `2024-01-01T00:00:00.000Z`). |
| `end` | string | No | End of time range (ISO date or datetime). |
| `limit` | number | No | Max rows returned. Default: 1000; capped at 5000. |

**Response:** `200 OK`

Body: array of objects:

| Field | Type | Description |
|------|------|-------------|
| `id` | UUID | Sighting primary key |
| `animal_id` | UUID | FK to animals.id |
| `latitude` | number | Latitude |
| `longitude` | number | Longitude |
| `timestamp` | string | ISO datetime (UTC) |

**Example request:**

```http
GET /api/sightings?species_id=550e8400-e29b-41d4-a716-446655440000&bbox=-10,35,10,55&limit=1000
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

**Query parameters:** Same as `/api/sightings` - `species_id`, `bbox`, `start`, `end`. Do **not** use `limit`.

**Response:** `200 OK`

Body: object:

| Field | Type | Description |
|------|------|-------------|
| `totalSightings` | number | Total count of sightings matching the filters |
| `byAnimal` | array | `[{ animal_id (UUID), count (number) }]` - per tracked individual (`animals.id`), descending by count |
| `byDay` | array | `[{ date (string), count (number) }]` - UTC calendar date `YYYY-MM-DD` |

**Example request:**

```http
GET /api/insights?species_id=550e8400-e29b-41d4-a716-446655440000&start=2024-01-01&end=2024-12-31
```

**Example response:**

```json
{
  "totalSightings": 1250,
  "byAnimal": [
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

**Use case:** A user searches "wolf" in the selector but does **not** pick a single species row. They want sightings for **every species** that matched the search (e.g. Gray Wolf and Red Wolf together), or a broader taxonomic group - not "one species" and not "everything in the viewport."

**Not in the API today.** That would need something like:

- Multiple parallel requests per chosen UUID, or a multi-value param such as **`species_ids`**
- A **`q` / search token** passed through to the backend so results match the same species set as the dropdown
- A taxonomy or **`species_group`** field on animals (see MVP schema notes) or similar grouping

Omitting `species_id` on `/api/sightings` / `/api/insights` today means **no species filter**: all species in the bbox/time window (subject to row limits on `/api/sightings`), **not** "only species whose names matched wolf."

---

## Error responses

Errors return a JSON object with an `error` (string) field and an appropriate HTTP status code:

- **400** - Bad request (e.g. invalid query parameters)
- **404** - Resource not found
- **500** - Internal server error (e.g. database or server failure)

The global error handler (see `backend/src/middleware/errorHandler.ts`) returns a generic 500 and message when an unhandled error occurs.

**Example error response:**

```json
{ "error": "Invalid bbox format. Use minLng,minLat,maxLng,maxLat" }
```
