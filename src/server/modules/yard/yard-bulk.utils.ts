export function parseFleetIdentifiers(value: unknown) {
  const raw = Array.isArray(value) ? value.map(String) : String(value || "").split(/[\s,;]+/);
  const identifiers: string[] = [], duplicates: string[] = [], seen = new Set<string>();
  for (const item of raw) {
    const normalized = item.trim().toUpperCase();
    if (!normalized) continue;
    if (seen.has(normalized)) duplicates.push(normalized);
    else { seen.add(normalized); identifiers.push(normalized); }
  }
  return { identifiers, duplicates };
}

export function splitByCapacity<T>(items: T[], available: number) {
  const limit = Math.max(0, Math.floor(available));
  return { accepted: items.slice(0, limit), overflow: items.slice(limit) };
}
