export interface GbifSearchResult {
  key: number;
  scientificName: string;
  canonicalName?: string;
  vernacularName?: string;
  rank: string;
  status?: string;
  confidence?: number;
  matchType?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
}

export interface GbifOccurrence {
  key: number;
  decimalLatitude: number;
  decimalLongitude: number;
  eventDate: string | null;
  species: string;
  scientificName: string;
  country: string | null;
  basisOfRecord: string;
  media: GbifMedia[];
  iucnRedListCategory: string | null;
  datasetName: string | null;
  recordedBy: string | null;
}

export interface GbifMedia {
  type: string;
  identifier: string;
  title?: string;
  creator?: string;
  license?: string;
}

export interface GbifOccurrenceResponse {
  count: number;
  results: GbifOccurrence[];
}

export interface GbifSpeciesDetail {
  key: number;
  scientificName: string;
  canonicalName?: string;
  vernacularName?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  media: GbifMedia[];
  iucnRedListCategory?: string;
  vernacularNames: Array<{ vernacularName: string; language: string }>;
  imageUrl?: string;
  description?: string;
}
