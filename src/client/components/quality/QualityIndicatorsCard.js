import { jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";
const PERIOD_LABELS = {
  THIS_MONTH: "Este m\xEAs",
  LAST_30_DAYS: "\xDAltimos 30 dias",
  LAST_90_DAYS: "\xDAltimos 90 dias",
  CUSTOM: "Personalizado"
};
const PALETTE = ["#22c55e", "#38bdf8", "#a78bfa", "#f59e0b", "#ef4444"];
const SEVERITY_ORDER = ["LEVE", "MEDIA", "GRAVE"];
function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
function getPeriodRange(option, customStart, customEnd) {
  const now = /* @__PURE__ */ new Date();
  if (option === "CUSTOM") {
    if (!customStart || !customEnd) return null;
    return {
      from: startOfDay(new Date(customStart)),
      to: endOfDay(new Date(customEnd))
    };
  }
  if (option === "LAST_30_DAYS") {
    const from2 = new Date(now);
    from2.setDate(from2.getDate() - 30);
    return { from: startOfDay(from2), to: endOfDay(now) };
  }
  if (option === "LAST_90_DAYS") {
    const from2 = new Date(now);
    from2.setDate(from2.getDate() - 90);
    return { from: startOfDay(from2), to: endOfDay(now) };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: startOfDay(from), to: endOfDay(now) };
}
function normalizeLabel(value) {
  const trimmed = value.trim();
  const key = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (key.includes("ferrugem")) return "Ferrugem";
  if (key.includes("resquicio")) return "Resquicio de produto";
  if (key.includes("fuligem") || key.includes("fulligem")) return "Fuligem";
  if (key.includes("amarelamento")) return "Amarelamento";
  if (key.includes("mancha")) return "Mancha";
  return trimmed;
}
function buildCategoryOptions(inspecoes) {
  const labels = /* @__PURE__ */ new Set();
  inspecoes.forEach((inspecao) => {
    inspecao.pontosCriticos.forEach((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      if (label) labels.add(label);
    });
  });
  return [...labels].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
function buildQualityAnalytics(inspecoes, selectedCategory) {
  const frequency = /* @__PURE__ */ new Map();
  const severityFrequency = new Map(SEVERITY_ORDER.map((severity) => [severity, 0]));
  let totalCriticalPoints = 0;
  inspecoes.forEach((inspecao) => {
    inspecao.pontosCriticos.forEach((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      if (!label) return;
      if (selectedCategory !== "ALL" && label !== selectedCategory) return;
      frequency.set(label, (frequency.get(label) ?? 0) + 1);
      severityFrequency.set(ponto.severidade, (severityFrequency.get(ponto.severidade) ?? 0) + 1);
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
    percentage: total > 0 ? count / total * 100 : 0,
    color: PALETTE[index % PALETTE.length],
    labels: [label]
  }));
  if (others > 0) {
    items.push({
      label: "Outros",
      count: others,
      percentage: total > 0 ? others / total * 100 : 0,
      color: "#64748b",
      labels: sorted.slice(5).map(([label]) => label)
    });
  }
  const severityItems = SEVERITY_ORDER.map((severity) => {
    const count = severityFrequency.get(severity) ?? 0;
    return {
      label: severity,
      count,
      percentage: totalCriticalPoints > 0 ? count / totalCriticalPoints * 100 : 0
    };
  });
  const withCriticalPoints = inspecoes.filter(
    (inspecao) => inspecao.pontosCriticos.some((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      return selectedCategory === "ALL" || label === selectedCategory;
    })
  ).length;
  return { items, total, severityItems, withCriticalPoints };
}
function filterByPeriod(inspecoes, option, customStart, customEnd) {
  const range = getPeriodRange(option, customStart, customEnd);
  if (!range) return [];
  return inspecoes.filter((inspecao) => {
    const date = new Date(inspecao.dataInspecao);
    return date >= range.from && date <= range.to;
  });
}
function DonutChart({ items }) {
  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  return /* @__PURE__ */ jsxs("div", { className: "quality-donut", children: [
    /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, role: "img", "aria-label": "Gr\xE1fico de recorr\xEAncias", children: [
      /* @__PURE__ */ jsx(
        "circle",
        {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          fill: "none",
          stroke: "rgba(148, 163, 184, 0.12)",
          strokeWidth
        }
      ),
      items.map((item) => {
        const dash = item.count / items.reduce((sum, current) => sum + current.count, 0) * circumference;
        const offset = circumference - cumulative;
        cumulative += dash;
        return /* @__PURE__ */ jsx(
          "circle",
          {
            cx: size / 2,
            cy: size / 2,
            r: radius,
            fill: "none",
            stroke: item.color,
            strokeWidth,
            strokeDasharray: `${dash} ${circumference - dash}`,
            strokeDashoffset: offset,
            transform: `rotate(-90 ${size / 2} ${size / 2})`,
            strokeLinecap: "round"
          },
          item.label
        );
      })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "quality-donut__center", children: [
      /* @__PURE__ */ jsx("strong", { children: items.reduce((sum, current) => sum + current.count, 0) }),
      /* @__PURE__ */ jsx("span", { children: "ocorr\xEAncias" })
    ] })
  ] });
}
function QualityIndicatorsCard({ inspecoes }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("THIS_MONTH");
  const [category, setCategory] = useState("ALL");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const filteredInspecoes = useMemo(() => filterByPeriod(inspecoes, period, customStart, customEnd), [inspecoes, period, customStart, customEnd]);
  const categoryOptions = useMemo(() => buildCategoryOptions(filteredInspecoes), [filteredInspecoes]);
  const totalInspecoes = filteredInspecoes.length;
  const topIssues = useMemo(() => buildQualityAnalytics(filteredInspecoes, category), [filteredInspecoes, category]);
  const leadingIssue = topIssues.items[0]?.label ?? "\u2014";
  function openIssuePage(item) {
    const params = new URLSearchParams();
    params.set("labels", (item.labels ?? [item.label]).join("|"));
    params.set("period", period);
    if (period === "CUSTOM") {
      if (customStart) params.set("from", customStart);
      if (customEnd) params.set("to", customEnd);
    }
    navigate(`/recorrencias/${encodeURIComponent(item.label)}?${params.toString()}`);
  }
  return /* @__PURE__ */ jsxs("section", { className: "quality-section", children: [
    /* @__PURE__ */ jsx("div", { className: "section-head quality-section__head", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "card-label", children: "Indicadores de Qualidade" }),
      /* @__PURE__ */ jsx("h2", { className: "section-title", children: "Recorr\xEAncias encontradas nas inspe\xE7\xF5es" })
    ] }) }),
    /* @__PURE__ */ jsxs(Card, { className: "quality-card card--elevated", children: [
      /* @__PURE__ */ jsxs("div", { className: "quality-toolbar", children: [
        /* @__PURE__ */ jsxs("label", { className: "input-field quality-select", children: [
          /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Per\xEDodo" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "select",
              value: period,
              onChange: (event) => setPeriod(event.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "THIS_MONTH", children: PERIOD_LABELS.THIS_MONTH }),
                /* @__PURE__ */ jsx("option", { value: "LAST_30_DAYS", children: PERIOD_LABELS.LAST_30_DAYS }),
                /* @__PURE__ */ jsx("option", { value: "LAST_90_DAYS", children: PERIOD_LABELS.LAST_90_DAYS }),
                /* @__PURE__ */ jsx("option", { value: "CUSTOM", children: PERIOD_LABELS.CUSTOM })
              ]
            }
          )
        ] }),
        period === "CUSTOM" ? /* @__PURE__ */ jsxs("div", { className: "quality-custom-dates", children: [
          /* @__PURE__ */ jsxs("label", { className: "input-field", children: [
            /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Data inicial" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "input",
                type: "date",
                value: customStart,
                onChange: (event) => setCustomStart(event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "input-field", children: [
            /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Data final" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "input",
                type: "date",
                value: customEnd,
                onChange: (event) => setCustomEnd(event.target.value)
              }
            )
          ] })
        ] }) : null,
        /* @__PURE__ */ jsxs("label", { className: "input-field quality-select", children: [
          /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Categoria" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "select",
              value: category,
              onChange: (event) => setCategory(event.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "ALL", children: "Todas" }),
                categoryOptions.map((option) => /* @__PURE__ */ jsx("option", { value: option, children: option }, option))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "quality-kpis", children: [
        /* @__PURE__ */ jsxs("article", { className: "quality-kpi", children: [
          /* @__PURE__ */ jsx("span", { children: "Total inspe\xE7\xF5es" }),
          /* @__PURE__ */ jsx("strong", { children: totalInspecoes })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "quality-kpi", children: [
          /* @__PURE__ */ jsx("span", { children: "Com ponto cr\xEDtico" }),
          /* @__PURE__ */ jsx("strong", { children: topIssues.withCriticalPoints })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "quality-kpi", children: [
          /* @__PURE__ */ jsx("span", { children: "Recorr\xEAncia l\xEDder" }),
          /* @__PURE__ */ jsx("strong", { children: leadingIssue })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "quality-layout", children: [
        /* @__PURE__ */ jsxs("div", { className: "quality-chart-panel", children: [
          topIssues.items.length > 0 ? /* @__PURE__ */ jsx(DonutChart, { items: topIssues.items }) : /* @__PURE__ */ jsx("p", { className: "helper", children: "Sem ocorr\xEAncias no per\xEDodo." }),
          /* @__PURE__ */ jsx("div", { className: "quality-legend", children: topIssues.items.map((item) => /* @__PURE__ */ jsxs("div", { className: "quality-legend__item", children: [
            /* @__PURE__ */ jsx("span", { className: "quality-legend__swatch", style: { backgroundColor: item.color } }),
            /* @__PURE__ */ jsx("span", { children: item.label }),
            /* @__PURE__ */ jsxs("strong", { children: [
              item.count,
              " \u2022 ",
              Math.round(item.percentage),
              "%"
            ] })
          ] }, item.label)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "quality-ranking", children: [
          /* @__PURE__ */ jsx("h3", { className: "section-title", children: "Top recorr\xEAncias" }),
          /* @__PURE__ */ jsxs("div", { className: "quality-ranking__list", children: [
            topIssues.items.map((item, index) => /* @__PURE__ */ jsxs("div", { className: "quality-ranking__item", style: { "--issue-color": item.color }, children: [
              /* @__PURE__ */ jsx("span", { className: "quality-ranking__position", children: index + 1 }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("strong", { children: item.label }),
                /* @__PURE__ */ jsxs("p", { className: "helper", children: [
                  item.count,
                  " ocorr\xEAncias \u2022 ",
                  Math.round(item.percentage),
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsx(Button, { type: "button", variant: "secondary", onClick: () => openIssuePage(item), children: "Abrir" })
            ] }, item.label)),
            topIssues.items.length === 0 ? /* @__PURE__ */ jsx("p", { className: "helper", children: "Nenhum item para listar." }) : null
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "quality-insights", children: [
          /* @__PURE__ */ jsxs("div", { className: "quality-insight-panel", children: [
            /* @__PURE__ */ jsx("h3", { className: "section-title", children: "Severidade" }),
            /* @__PURE__ */ jsx("div", { className: "quality-bars", children: topIssues.severityItems.map((item) => /* @__PURE__ */ jsxs("div", { className: "quality-bar-row", children: [
              /* @__PURE__ */ jsx("span", { children: item.label }),
              /* @__PURE__ */ jsx("div", { className: "quality-bar-track", children: /* @__PURE__ */ jsx("span", { style: { width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` } }) }),
              /* @__PURE__ */ jsx("strong", { children: item.count })
            ] }, item.label)) })
          ] }),
        ] })
      ] })
    ] })
  ] });
}
export {
  QualityIndicatorsCard as default
};
