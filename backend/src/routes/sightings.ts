import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
import { parseSightingsFilters } from "../lib/parseSightingsFilters";

const router = Router();

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // --- limit ---
    const limitParam = req.query.limit;
    let limit = DEFAULT_LIMIT;
    if (limitParam !== undefined) {
      if (typeof limitParam !== "string") {
        res.status(400).json({ error: "Invalid limit parameter" });
        return;
      }
      if (!/^\d+$/.test(limitParam.trim())) {
        res.status(400).json({ error: "limit must be a positive integer" });
        return;
      }
      const parsed = Number(limitParam.trim());
      if (!Number.isInteger(parsed) || parsed < 1) {
        res.status(400).json({ error: "limit must be a positive integer" });
        return;
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    const parsedFilters = parseSightingsFilters(req.query);
    if (!parsedFilters.ok) {
      res.status(parsedFilters.status).json(parsedFilters.body);
      return;
    }
    const { species_id, bbox, start, end } = parsedFilters;

    // Always join through animals → species so every sighting includes species context.
    const selectCols =
      "id, animal_id, latitude, longitude, timestamp, animals!inner(species_id, name, species:species_id(id, common_name, scientific_name))";

    let query = supabase
      .from("sightings")
      .select(selectCols)
      .order("timestamp", { ascending: true })
      .limit(limit);

    if (species_id) {
      query = query.eq("animals.species_id", species_id);
    }

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      query = query
        .gte("longitude", minLng)
        .lte("longitude", maxLng)
        .gte("latitude", minLat)
        .lte("latitude", maxLat);
    }

    if (start) {
      query = query.gte("timestamp", start);
    }

    if (end) {
      query = query.lte("timestamp", end);
    }

    const { data, error } = await query;

    if (error) {
      next(error);
      return;
    }

    // Flatten the nested join into a cleaner response shape
    interface RawRow {
      id: string;
      animal_id: string;
      latitude: number;
      longitude: number;
      timestamp: string;
      animals: {
        species_id: string;
        name: string | null;
        species: {
          id: string;
          common_name: string;
          scientific_name: string;
        } | null;
      };
    }

    const rows = ((data ?? []) as unknown as RawRow[]).map((row) => ({
      id: row.id,
      animal_id: row.animal_id,
      latitude: row.latitude,
      longitude: row.longitude,
      timestamp: row.timestamp,
      animal_name: row.animals?.name ?? null,
      species_id: row.animals?.species_id ?? null,
      common_name: row.animals?.species?.common_name ?? null,
      scientific_name: row.animals?.species?.scientific_name ?? null,
    }));

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
