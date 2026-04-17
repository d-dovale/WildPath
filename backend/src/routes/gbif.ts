import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import {
  searchSpecies,
  fetchOccurrences,
  fetchSpeciesDetail,
} from "../lib/gbifClient";
import { fetchINaturalist, fetchWikipedia } from "../lib/enrichSpecies";

const router = Router();

const MAX_QUERY_LENGTH = 100;
const MAX_OCCURRENCE_LIMIT = 300;

// ---------------------------------------------------------------------------
// GET /api/gbif/search?q=...
// ---------------------------------------------------------------------------

router.get(
  "/search",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = req.query.q;
      if (typeof q !== "string" || q.trim().length === 0) {
        res.status(400).json({ error: "q parameter is required" });
        return;
      }

      const trimmed = q.trim().slice(0, MAX_QUERY_LENGTH);

      const results = await searchSpecies(trimmed);

      res.set("Cache-Control", "public, max-age=300");
      res.json({ results });
    } catch (err) {
      if (isAxios429(err)) {
        res
          .status(503)
          .json({ error: "GBIF rate limit reached. Try again shortly." });
        return;
      }
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/gbif/occurrences?taxonKey=...&limit=...&bbox=...&year=...
// ---------------------------------------------------------------------------

router.get(
  "/occurrences",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // taxonKey — required positive integer
      const taxonKeyParam = req.query.taxonKey;
      if (typeof taxonKeyParam !== "string" || !/^\d+$/.test(taxonKeyParam)) {
        res.status(400).json({ error: "taxonKey must be a positive integer" });
        return;
      }
      const taxonKey = Number(taxonKeyParam);

      // limit — optional, default 300, max 300
      let limit = MAX_OCCURRENCE_LIMIT;
      const limitParam = req.query.limit;
      if (typeof limitParam === "string" && /^\d+$/.test(limitParam)) {
        limit = Math.min(Number(limitParam), MAX_OCCURRENCE_LIMIT);
      }

      // bbox — optional, format: "minLng,minLat,maxLng,maxLat"
      let bbox: [number, number, number, number] | undefined;
      const bboxParam = req.query.bbox;
      if (typeof bboxParam === "string") {
        const parts = bboxParam.split(",").map(Number);
        if (parts.length === 4 && parts.every(Number.isFinite)) {
          bbox = parts as [number, number, number, number];
        }
      }

      // year — optional, e.g. "2020" or "2020,2024"
      const year =
        typeof req.query.year === "string" ? req.query.year : undefined;

      const data = await fetchOccurrences(taxonKey, { limit, bbox, year });

      res.set("Cache-Control", "public, max-age=300");
      res.json(data);
    } catch (err) {
      if (isAxios429(err)) {
        res
          .status(503)
          .json({ error: "GBIF rate limit reached. Try again shortly." });
        return;
      }
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/gbif/species/:key
// ---------------------------------------------------------------------------

router.get(
  "/species/:key",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keyParam = req.params.key as string;
      if (!/^\d+$/.test(keyParam)) {
        res
          .status(400)
          .json({ error: "Species key must be a positive integer" });
        return;
      }

      const detail = await fetchSpeciesDetail(Number(keyParam));

      // Enrich with iNaturalist + Wikipedia fallbacks
      const enriched = await enrichGbifDetail(detail);

      res.set("Cache-Control", "public, max-age=300");
      res.json(enriched);
    } catch (err) {
      if (isAxios429(err)) {
        res
          .status(503)
          .json({ error: "GBIF rate limit reached. Try again shortly." });
        return;
      }
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { GbifSpeciesDetail } from "../lib/gbifClient";

const INAT_STATUS_TO_IUCN: Record<string, string> = {
  least_concern: "LC",
  near_threatened: "NT",
  vulnerable: "VU",
  endangered: "EN",
  critically_endangered: "CR",
  extinct_in_the_wild: "EW",
  extinct: "EX",
  data_deficient: "DD",
};

export async function enrichGbifDetail(
  detail: GbifSpeciesDetail,
): Promise<GbifSpeciesDetail> {
  const scientificName = detail.canonicalName ?? detail.scientificName;

  // Run iNaturalist + Wikipedia in parallel
  const [inat, wiki] = await Promise.all([
    fetchINaturalist(scientificName),
    fetchWikipedia(scientificName.replace(/ /g, "_")),
  ]);

  const inatPhoto = inat?.default_photo?.medium_url;
  const gbifPhoto = selectPreferredGbifPhoto(detail.media);
  const gbifFallbackImage = selectFallbackGbifImage(detail.media);
  const wikiThumbnail = wiki?.thumbnail?.source;
  const preferredImage =
    inatPhoto ||
    gbifPhoto?.identifier ||
    (wikiThumbnail && !isLikelyMapLikeImage(wikiThumbnail)
      ? wikiThumbnail
      : undefined) ||
    gbifFallbackImage?.identifier ||
    wikiThumbnail;

  if (preferredImage) {
    detail = { ...detail, imageUrl: preferredImage };
  }

  // Description from Wikipedia
  if (wiki?.extract) {
    detail = { ...detail, description: wiki.extract };
  }

  // IUCN status: fallback to iNaturalist if GBIF has none
  if (!detail.iucnRedListCategory && inat?.conservation_status?.status_name) {
    const mapped =
      INAT_STATUS_TO_IUCN[inat.conservation_status.status_name] ??
      inat.conservation_status.status_name;
    detail = { ...detail, iucnRedListCategory: mapped };
  }

  return detail;
}

function isAxios429(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    (err as { response?: { status?: number } }).response?.status === 429
  );
}

function selectPreferredGbifPhoto(media: GbifSpeciesDetail["media"]) {
  const gbifImages = media.filter(
    (item) => item.type === "StillImage" && item.identifier,
  );

  return gbifImages.find((item) => !isLikelyMapLikeImage(getMediaSearchText(item)));
}

function selectFallbackGbifImage(media: GbifSpeciesDetail["media"]) {
  return media.find((item) => item.type === "StillImage" && item.identifier);
}

function isLikelyMapLikeImage(value: string): boolean {
  const normalized = value.toLowerCase();
  return [
    "chart",
    "distribution",
    "locator",
    "map",
    "range",
    "svg",
  ].some((token) => normalized.includes(token));
}

function getMediaSearchText(media: GbifSpeciesDetail["media"][number]): string {
  return [media.identifier, media.title, media.creator].filter(Boolean).join(" ");
}

export default router;
