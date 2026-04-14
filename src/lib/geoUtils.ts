/**
 * Normalizes country names for comparison.
 * Handles "US" and "United States" as the same.
 */
export function normalizeCountry(country: string): string {
  if (!country) return "";
  const normalized = country.trim().toLowerCase();
  if (normalized === "us" || normalized === "usa" || normalized === "united states" || normalized === "united states of america") {
    return "united states";
  }
  return normalized;
}

/**
 * Checks if a worker's country matches a task's target geography.
 */
export function isGeoMatch(taskGeo: string, workerCountry: string): boolean {
  if (!taskGeo || taskGeo.toLowerCase() === "global") return true;
  if (!workerCountry) return false;

  const normalizedWorkerCountry = normalizeCountry(workerCountry);
  const taskGeos = taskGeo.split(",").map(g => normalizeCountry(g.trim()));

  return taskGeos.some(geo => 
    geo === "global" || 
    geo === normalizedWorkerCountry || 
    normalizedWorkerCountry.includes(geo) || 
    geo.includes(normalizedWorkerCountry)
  );
}
