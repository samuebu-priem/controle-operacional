export interface InspectorPerformanceRow {
  inspector: string;
  totalInspecoes: number;
  periodInspecoes: number;
  todayInspecoes: number;
  weekInspecoes: number;
  monthInspecoes: number;
  nonConformities: number;
  criteria: string[];
}

export interface InspectorPerformanceSummary {
  name: string;
  totalInspecoes: number;
  todayInspecoes: number;
  weekInspecoes: number;
  monthInspecoes: number;
  productivity: number;
  nonConformities: number;
  nonConformityRate: number;
  topCriteria: Array<{ label: string; count: number }>;
}

const criterionAliases: Array<{ matchers: RegExp[]; label: string }> = [
  { matchers: [/ferrug/], label: "Ferrugem" },
  { matchers: [/manch/], label: "Mancha" },
  { matchers: [/odor|odôr|cheiro/], label: "Odor" },
  { matchers: [/residu|resíduo|residuo/], label: "Resíduo" },
  { matchers: [/amarel/], label: "Amarelamento" },
  { matchers: [/contamin/], label: "Contaminação" },
  { matchers: [/valvula|válvula/], label: "Válvula" }
];

export function normalizeCriterion(value: string) {
  const text = value.trim().toLowerCase();

  if (!text) return "Outros";

  for (const alias of criterionAliases) {
    if (alias.matchers.some((matcher) => matcher.test(text))) {
      return alias.label;
    }
  }

  return "Outros";
}

export function buildInspectorPerformance(rows: InspectorPerformanceRow[]): InspectorPerformanceSummary[] {
  const max = rows.reduce((highest, row) => Math.max(highest, row.periodInspecoes), 0);

  return rows
    .map((row) => {
      const counts = new Map<string, number>();
      for (const criterion of row.criteria) {
        const normalized = normalizeCriterion(criterion);
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      }

      const topCriteria = Array.from(counts.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 4)
        .map(([label, count]) => ({ label, count }));

      const productivity = max > 0 ? Math.round((row.periodInspecoes / max) * 100) : 0;
      const nonConformityRate = row.periodInspecoes > 0 ? Math.round((row.nonConformities / row.periodInspecoes) * 1000) / 10 : 0;

      return {
        name: row.inspector,
        totalInspecoes: row.totalInspecoes,
        todayInspecoes: row.todayInspecoes,
        weekInspecoes: row.weekInspecoes,
        monthInspecoes: row.monthInspecoes,
        productivity,
        nonConformities: row.nonConformities,
        nonConformityRate,
        topCriteria
      };
    })
    .sort((left, right) => right.productivity - left.productivity || right.totalInspecoes - left.totalInspecoes);
}
