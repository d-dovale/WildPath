import type { Sighting } from "@/types/sighting";

export function buildGbifPopup(sighting: Sighting): string {
  const name = sighting.common_name ?? "Unknown";
  const dateStr = sighting.timestamp
    ? new Date(sighting.timestamp).toLocaleDateString()
    : "Date unknown";
  const basisLabel = formatBasisOfRecord(sighting.basisOfRecord ?? "");

  return `<div class="p-1">
    <p class="text-sm font-semibold">${escapeHtml(name)}</p>
    ${sighting.scientific_name ? `<p class="text-xs italic text-gray-500">${escapeHtml(sighting.scientific_name)}</p>` : ""}
    <p class="text-xs text-gray-600 mt-1">${escapeHtml(dateStr)}</p>
    ${sighting.country ? `<p class="text-xs text-gray-600">${escapeHtml(sighting.country)}</p>` : ""}
    ${basisLabel ? `<p class="text-xs text-gray-400">${escapeHtml(basisLabel)}</p>` : ""}
  </div>`;
}

export function buildMovebankPopup(sighting: Sighting): string {
  const name = sighting.common_name ?? sighting.animal_name ?? "Unknown";
  return `<div class="p-1">
    <p class="text-sm font-semibold">${escapeHtml(name)}</p>
    ${sighting.scientific_name ? `<p class="text-xs italic text-gray-500">${escapeHtml(sighting.scientific_name)}</p>` : ""}
    <p class="text-xs text-gray-600 mt-1">${escapeHtml(new Date(sighting.timestamp).toLocaleString())}</p>
  </div>`;
}

function formatBasisOfRecord(basis: string): string {
  const labels: Record<string, string> = {
    HUMAN_OBSERVATION: "Human Observation",
    MACHINE_OBSERVATION: "Machine Observation",
    PRESERVED_SPECIMEN: "Preserved Specimen",
    FOSSIL_SPECIMEN: "Fossil Specimen",
    LIVING_SPECIMEN: "Living Specimen",
    MATERIAL_SAMPLE: "Material Sample",
    OCCURRENCE: "Occurrence",
  };
  return labels[basis] ?? basis.replace(/_/g, " ").toLowerCase();
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
