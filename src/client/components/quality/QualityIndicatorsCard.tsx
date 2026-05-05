import { useMemo, useState, type ChangeEvent } from "react";
import type { Inspecao } from "../../../shared/types";
import Card from "../ui/Card";

type PeriodOption = "THIS_MONTH" | "LAST_30_DAYS" | "LAST_90_DAYS" | "CUSTOM";

type IndicatorItem = {
  label: string;
  count: number;
  percentage: number;
  color: string;
};

type SeverityItem = {
  label: string;
  count: number;
  percentage: number;
};

type TrendItem = {
  label: string;
  total: number;
  withCriticalPoints: number;
  rate: number;
};

type QualityIndicatorsCardProps = {
  inspecoes: Inspecao[];
};

const PERIOD_LABELS: Record<PeriodOption, string> = {
  THIS_MONTH: "Este mês",
  LAST_30_DAYS: "Últimos 30 dias",
  LAST_90_DAYS: "Últimos 90 dias",
  CUSTOM: "Personalizado"
};

const PALETTE = ["#22c55e", "#38bdf8", "#a78bfa", "#f59e0b", "#ef4444"];
const SEVERITY_ORDER = ["LEVE", "MEDIA", "GRAVE"] as const;
const SEVERITY_WEIGHT: Record<(typeof SEVERITY_ORDER)[number], number> = {
  LEVE: 1,
  MEDIA: 2,
  GRAVE: 3
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function getPeriodRange(option: PeriodOption, customStart?: string, customEnd?: string) {
  const now = new Date();

  if (option === "CUSTOM") {
    if (!customStart || !customEnd) return null;
    return {
      from: startOfDay(new Date(customStart)),
      to: endOfDay(new Date(customEnd))
    };
  }

  if (option === "LAST_30_DAYS") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  if (option === "LAST_90_DAYS") {
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: startOfDay(from), to: endOfDay(now) };
}

function normalizeLabel(value: string) {
  const trimmed = value.trim();
  const key = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (key.includes("ferrugem")) return "Ferrugem";
  if (key.includes("resquicio")) return "Resquicio de produto";
  if (key.includes("fuligem") || key.includes("fulligem")) return "Fuligem";
  if (key.includes("amarelamento")) return "Amarelamento";
  if (key.includes("mancha")) return "Mancha";

  return trimmed;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function buildTrend(inspecoes: Inspecao[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date),
      total: 0,
      withCriticalPoints: 0,
      rate: 0
    };
  });
  const byMonth = new Map(months.map((item) => [item.key, item]));

  inspecoes.forEach((inspecao) => {
    const date = new Date(inspecao.dataInspecao);
    const item = byMonth.get(monthKey(date));
    if (!item) return;
    item.total += 1;
    if (inspecao.pontosCriticos.length > 0) item.withCriticalPoints += 1;
  });

  return months.map((item) => ({
    ...item,
    rate: item.total > 0 ? (item.withCriticalPoints / item.total) * 100 : 0
  }));
}

function buildCategoryOptions(inspecoes: Inspecao[]) {
  const labels = new Set<string>();

  inspecoes.forEach((inspecao) => {
    inspecao.pontosCriticos.forEach((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      if (label) labels.add(label);
    });
  });

  return [...labels].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function buildQualityAnalytics(inspecoes: Inspecao[], selectedCategory: string) {
  const frequency = new Map<string, number>();
  const severityFrequency = new Map<string, number>(SEVERITY_ORDER.map((severity) => [severity, 0]));
  let totalCriticalPoints = 0;
  let severityPenalty = 0;

  inspecoes.forEach((inspecao) => {
    inspecao.pontosCriticos.forEach((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      if (!label) return;
      if (selectedCategory !== "ALL" && label !== selectedCategory) return;

      frequency.set(label, (frequency.get(label) ?? 0) + 1);
      severityFrequency.set(ponto.severidade, (severityFrequency.get(ponto.severidade) ?? 0) + 1);
      severityPenalty += SEVERITY_WEIGHT[ponto.severidade] ?? 1;
      totalCriticalPoints += 1;
    });
  });

  const sorted = [...frequency.entries()].sort((a, b) => b[1] - a[1]);
  const topFive = sorted.slice(0, 5);
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  const others = total - topFive.reduce((sum, [, count]) => sum + count, 0);

  const items = topFive.map(([label, count], index) => ({
    label,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
    color: PALETTE[index % PALETTE.length]
  }));

  if (others > 0) {
    items.push({
      label: "Outros",
      count: others,
      percentage: total > 0 ? (others / total) * 100 : 0,
      color: "#64748b"
    });
  }

  const severityItems = SEVERITY_ORDER.map((severity) => {
    const count = severityFrequency.get(severity) ?? 0;
    return {
      label: severity,
      count,
      percentage: totalCriticalPoints > 0 ? (count / totalCriticalPoints) * 100 : 0
    };
  });
  const withCriticalPoints = inspecoes.filter((inspecao) =>
    inspecao.pontosCriticos.some((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      return selectedCategory === "ALL" || label === selectedCategory;
    })
  ).length;
  const maxPenalty = Math.max(inspecoes.length * SEVERITY_WEIGHT.GRAVE, 1);
  const score = Math.max(0, Math.round((1 - Math.min(severityPenalty / maxPenalty, 1)) * 100));
  const complianceRate = inspecoes.length > 0 ? Math.round(((inspecoes.length - withCriticalPoints) / inspecoes.length) * 100) : 0;

  return { items, total, severityItems, withCriticalPoints, score, complianceRate };
}

function filterByPeriod(inspecoes: Inspecao[], option: PeriodOption, customStart: string, customEnd: string) {
  const range = getPeriodRange(option, customStart, customEnd);
  if (!range) return [];
  return inspecoes.filter((inspecao) => {
    const date = new Date(inspecao.dataInspecao);
    return date >= range.from && date <= range.to;
  });
}

function DonutChart({ items }: { items: IndicatorItem[] }) {
  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div className="quality-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfico de recorrências">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.12)"
          strokeWidth={strokeWidth}
        />
        {items.map((item) => {
          const dash = (item.count / items.reduce((sum, current) => sum + current.count, 0)) * circumference;
          const offset = circumference - cumulative;
          cumulative += dash;
          return (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="quality-donut__center">
        <strong>{items.reduce((sum, current) => sum + current.count, 0)}</strong>
        <span>ocorrências</span>
      </div>
    </div>
  );
}

export default function QualityIndicatorsCard({ inspecoes }: QualityIndicatorsCardProps) {
  const [period, setPeriod] = useState<PeriodOption>("THIS_MONTH");
  const [category, setCategory] = useState("ALL");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const filteredInspecoes = useMemo(() => filterByPeriod(inspecoes, period, customStart, customEnd), [inspecoes, period, customStart, customEnd]);
  const categoryOptions = useMemo(() => buildCategoryOptions(filteredInspecoes), [filteredInspecoes]);

  const totalInspecoes = filteredInspecoes.length;
  const topIssues = useMemo(() => buildQualityAnalytics(filteredInspecoes, category), [filteredInspecoes, category]);
  const trend = useMemo(() => buildTrend(inspecoes), [inspecoes]);
  const leadingIssue = topIssues.items[0]?.label ?? "—";

  const maxTrendRate = Math.max(...trend.map((item) => item.rate), 1);

  return (
    <section className="quality-section">
      <div className="section-head quality-section__head">
        <div>
          <p className="card-label">Indicadores de Qualidade</p>
          <h2 className="section-title">Recorrências encontradas nas inspeções</h2>
        </div>
      </div>

      <Card className="quality-card card--elevated">
        <div className="quality-toolbar">
          <label className="input-field quality-select">
            <span className="input-field__label">Período</span>
            <select
              className="select"
              value={period}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setPeriod(event.target.value as PeriodOption)}
            >
              <option value="THIS_MONTH">{PERIOD_LABELS.THIS_MONTH}</option>
              <option value="LAST_30_DAYS">{PERIOD_LABELS.LAST_30_DAYS}</option>
              <option value="LAST_90_DAYS">{PERIOD_LABELS.LAST_90_DAYS}</option>
              <option value="CUSTOM">{PERIOD_LABELS.CUSTOM}</option>
            </select>
          </label>

          {period === "CUSTOM" ? (
            <div className="quality-custom-dates">
              <label className="input-field">
                <span className="input-field__label">Data inicial</span>
                <input
                  className="input"
                  type="date"
                  value={customStart}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setCustomStart(event.target.value)}
                />
              </label>
              <label className="input-field">
                <span className="input-field__label">Data final</span>
                <input
                  className="input"
                  type="date"
                  value={customEnd}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setCustomEnd(event.target.value)}
                />
              </label>
            </div>
          ) : null}

          <label className="input-field quality-select">
            <span className="input-field__label">Categoria</span>
            <select
              className="select"
              value={category}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value)}
            >
              <option value="ALL">Todas</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="quality-kpis">
          <article className="quality-kpi">
            <span>Total inspeções</span>
            <strong>{totalInspecoes}</strong>
          </article>
          <article className="quality-kpi">
            <span>Com ponto crítico</span>
            <strong>{topIssues.withCriticalPoints}</strong>
          </article>
          <article className="quality-kpi">
            <span>Conformidade</span>
            <strong>{topIssues.complianceRate}%</strong>
          </article>
          <article className="quality-kpi">
            <span>Nota qualidade</span>
            <strong>{topIssues.score}</strong>
          </article>
          <article className="quality-kpi">
            <span>Recorrência líder</span>
            <strong>{leadingIssue}</strong>
          </article>
        </div>

        <div className="quality-layout">
          <div className="quality-chart-panel">
            {topIssues.items.length > 0 ? <DonutChart items={topIssues.items} /> : <p className="helper">Sem ocorrências no período.</p>}
            <div className="quality-legend">
              {topIssues.items.map((item) => (
                <div key={item.label} className="quality-legend__item">
                  <span className="quality-legend__swatch" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                  <strong>
                    {item.count} • {Math.round(item.percentage)}%
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="quality-ranking">
            <h3 className="section-title">Top recorrências</h3>
            <div className="quality-ranking__list">
              {topIssues.items.map((item, index) => (
                <div key={item.label} className="quality-ranking__item">
                  <span className="quality-ranking__position">{index + 1}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <p className="helper">
                      {item.count} ocorrências • {Math.round(item.percentage)}%
                    </p>
                  </div>
                </div>
              ))}
              {topIssues.items.length === 0 ? <p className="helper">Nenhum item para listar.</p> : null}
            </div>
          </div>

          <div className="quality-insights">
            <div className="quality-insight-panel">
              <h3 className="section-title">Severidade</h3>
              <div className="quality-bars">
                {topIssues.severityItems.map((item) => (
                  <div key={item.label} className="quality-bar-row">
                    <span>{item.label}</span>
                    <div className="quality-bar-track">
                      <span style={{ width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` }} />
                    </div>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="quality-insight-panel">
              <h3 className="section-title">Ultimos 6 meses</h3>
              <div className="quality-trend">
                {trend.map((item: TrendItem) => (
                  <div key={item.label} className="quality-trend__item">
                    <div className="quality-trend__bar">
                      <span style={{ height: `${Math.max((item.rate / maxTrendRate) * 100, item.rate > 0 ? 8 : 0)}%` }} />
                    </div>
                    <strong>{Math.round(item.rate)}%</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
