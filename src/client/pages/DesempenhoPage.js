import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getDesempenhoDashboard } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

const FILTERS = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "custom", label: "Personalizado" }
];

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value) {
  return `${value}%`;
}

export default function DesempenhoPage() {
  const [range, setRange] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(activeRange = range, activeFrom = from, activeTo = to) {
    setLoading(true);
    setError("");

    try {
      const response = await getDesempenhoDashboard({
        range: activeRange,
        from: activeFrom,
        to: activeTo
      });
      setSummary(response.summary ?? []);
      setComparison(response.comparison ?? []);
    } catch (err) {
      setSummary([]);
      setComparison([]);
      setError(err instanceof Error ? err.message : "Não foi possível carregar o desempenho.");
    } finally {
      setLoading(false);
    }
  }

  function handleRangeChange(nextRange) {
    setRange(nextRange);
    if (nextRange !== "custom") {
      setFrom("");
      setTo("");
      void loadData(nextRange, "", "");
      return;
    }
    void loadData(nextRange, from, to);
  }

  function handleApplyCustom() {
    void loadData("custom", from, to);
  }

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame performance-page",
      children: [
        _jsx(AppHeader, {
          title: "Desempenho dos Inspetores",
          subtitle: "Visão gerencial de produtividade, não conformidades e critérios recorrentes.",
          showBack: false,
          showLogout: true
        }),
        _jsx(Card, {
          className: "section-card performance-toolbar",
          children: _jsxs("div", {
            className: "performance-toolbar__content",
            children: [
              _jsxs("div", {
                className: "performance-toolbar__buttons",
                children: [
                  FILTERS.map((filter) => _jsx(Button, {
                    type: "button",
                    variant: range === filter.key ? "primary" : "secondary",
                    className: `performance-filter ${range === filter.key ? "performance-filter--active" : ""}`,
                    onClick: () => handleRangeChange(filter.key),
                    children: filter.label
                  }, filter.key))
                ]
              }),
              range === "custom" ? _jsxs("div", {
                className: "performance-toolbar__dates",
                children: [
                  _jsx("label", {
                    className: "field-label",
                    children: _jsxs("span", {
                      children: ["De", _jsx("input", { type: "date", value: from, onChange: (event) => setFrom(event.target.value) })]
                    })
                  }),
                  _jsx("label", {
                    className: "field-label",
                    children: _jsxs("span", {
                      children: ["Até", _jsx("input", { type: "date", value: to, onChange: (event) => setTo(event.target.value) })]
                    })
                  }),
                  _jsx(Button, { type: "button", variant: "primary", onClick: handleApplyCustom, children: "Aplicar" })
                ]
              }) : null
            ]
          })
        }),
        error ? _jsx("p", { className: "notice notice--error", children: error }) : null,
        loading ? _jsx(Card, { className: "section-card performance-empty", children: "Carregando desempenho..." }) : null,
        !loading && summary.length === 0 ? _jsx(Card, { className: "section-card performance-empty", children: "Nenhum registro encontrado para o período selecionado." }) : null,
        !loading && summary.length > 0 ? _jsxs("div", {
          className: "performance-grid",
          children: [
            _jsx("div", {
              className: "performance-cards",
              children: summary.map((item) => _jsx(Card, {
                className: "section-card performance-card",
                children: _jsxs("div", {
                  className: "performance-card__body",
                  children: [
                    _jsxs("div", {
                      className: "performance-card__header",
                      children: [
                        _jsxs("div", {
                          children: [
                            _jsx("h2", { children: item.name }),
                            _jsx("p", { className: "performance-card__subtitle", children: `Produtividade ${formatPercent(item.productivity)}` })
                          ]
                        }),
                        _jsx("span", { className: `performance-badge ${item.productivity >= 80 ? "performance-badge--good" : "performance-badge--warn"}`, children: item.productivity >= 80 ? "Bom desempenho" : "Acompanhar" })
                      ]
                    }),
                    _jsxs("div", { className: "performance-metrics", children: [
                      _jsxs("div", { className: "performance-metric", children: [_jsx("span", { children: "Total" }), _jsx("strong", { children: formatNumber(item.totalInspecoes) })] }),
                      _jsxs("div", { className: "performance-metric", children: [_jsx("span", { children: "Hoje" }), _jsx("strong", { children: formatNumber(item.todayInspecoes) })] }),
                      _jsxs("div", { className: "performance-metric", children: [_jsx("span", { children: "Semana" }), _jsx("strong", { children: formatNumber(item.weekInspecoes) })] }),
                      _jsxs("div", { className: "performance-metric", children: [_jsx("span", { children: "Mês" }), _jsx("strong", { children: formatNumber(item.monthInspecoes) })] })
                    ] }),
                    _jsxs("div", { className: "performance-metrics performance-metrics--secondary", children: [
                      _jsxs("div", { className: "performance-metric", children: [_jsx("span", { children: "NC encontradas" }), _jsx("strong", { children: formatNumber(item.nonConformities) })] }),
                      _jsxs("div", { className: "performance-metric", children: [_jsx("span", { children: "NC/inspeção" }), _jsx("strong", { children: `${item.nonConformityRate.toFixed(1)}%` })] })
                    ] }),
                    _jsxs("div", { className: "performance-criteria", children: [
                      _jsx("h3", { children: "Critérios mais encontrados" }),
                      _jsx("ul", { children: item.topCriteria.length > 0 ? item.topCriteria.map((criterion) => _jsx("li", { children: _jsxs("span", { children: [criterion.label, _jsx("strong", { children: formatNumber(criterion.count) })] }) }, `${criterion.label}-${criterion.count}`)) : _jsx("li", { children: "Nenhum critério encontrado" }) })
                    ] })
                  ]
                })
              }, item.name))
            })
          ]
        }) : null,
        !loading && comparison.length > 0 ? _jsx(Card, {
          className: "section-card performance-table-card",
          children: _jsxs("div", {
            className: "performance-table-wrapper",
            children: [
              _jsx("h2", { children: "Comparativo por inspetor" }),
              _jsx("table", { className: "performance-table", children: _jsxs("tbody", { children: [
                _jsx("tr", { children: [_jsx("th", { children: "Inspetor" }), _jsx("th", { children: "Hoje" }), _jsx("th", { children: "Semana" }), _jsx("th", { children: "Mês" }), _jsx("th", { children: "Total" }), _jsx("th", { children: "Produtividade" }), _jsx("th", { children: "NC encontradas" }), _jsx("th", { children: "NC/Inspeção" }), _jsx("th", { children: "Critério principal" })] }),
                comparison.map((item) => _jsx("tr", { children: [_jsx("td", { children: item.name }), _jsx("td", { children: formatNumber(item.todayInspecoes) }), _jsx("td", { children: formatNumber(item.weekInspecoes) }), _jsx("td", { children: formatNumber(item.monthInspecoes) }), _jsx("td", { children: formatNumber(item.totalInspecoes) }), _jsx("td", { children: formatPercent(item.productivity) }), _jsx("td", { children: formatNumber(item.nonConformities) }), _jsx("td", { children: `${item.nonConformityRate.toFixed(1)}%` }), _jsx("td", { children: item.topCriterion })] }, item.name))
              ] }) })
            ]
          })
        }) : null
      ]
    })
  });
}
