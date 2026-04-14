export interface Sighting {
  id: string;
  animal_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  animal_name: string | null;
  species_id: string | null;
  common_name: string | null;
  scientific_name: string | null;
  source?: "movebank" | "gbif";
  country?: string | null;
  basisOfRecord?: string | null;
}
