import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { listInspecoes } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

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

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "--";
}

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

function getPeriodRange(period, from, to) {
  const now = new Date();
  if (period === "CUSTOM" && from && to) return { from: startOfDay(new Date(from)), to: endOfDay(new Date(to)) };
  if (period === "LAST_30_DAYS") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { from: startOfDay(start), to: endOfDay(now) };
  }
  if (period === "LAST_90_DAYS") {
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    return { from: startOfDay(start), to: endOfDay(now) };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: startOfDay(start), to: endOfDay(now) };
}

function filterByPeriod(inspecoes, period, from, to) {
  const range = getPeriodRange(period, from, to);
  return inspecoes.filter((inspecao) => {
    const date = new Date(inspecao.dataInspecao);
    return date >= range.from && date <= range.to;
  });
}

function buildFleetOccurrences(inspecoes, labels) {
  const wanted = new Set(labels.map(normalizeLabel));
  const fleets = /* @__PURE__ */ new Map();

  inspecoes.forEach((inspecao) => {
    const matchingPoints = (inspecao.pontosCriticos ?? []).filter((ponto) => wanted.has(normalizeLabel(ponto.categoria)));
    if (matchingPoints.length === 0) return;

    const frota = inspecao.frota;
    const key = frota?.id ?? inspecao.frotaId ?? frota?.numeroFrota ?? "sem-frota";
    const current = fleets.get(key) ?? {
      id: frota?.id ?? inspecao.frotaId ?? "",
      numeroFrota: frota?.numeroFrota ?? inspecao.frotaId ?? "Nao informada",
      placa: frota?.placa ?? "Nao informada",
      tipoEquipamento: frota?.tipoEquipamento ?? "Nao informado",
      ocorrencias: 0,
      inspecoes: 0,
      ultimaInspecao: inspecao.dataInspecao,
      pontos: []
    };

    current.ocorrencias += matchingPoints.length;
    current.inspecoes += 1;
    current.pontos.push(
      ...matchingPoints.map((ponto) => ({
        categoria: normalizeLabel(ponto.categoria),
        localizacao: ponto.localizacao,
        severidade: ponto.severidade,
        dataInspecao: inspecao.dataInspecao,
        inspecaoId: inspecao.id
      }))
    );
    if (new Date(inspecao.dataInspecao) > new Date(current.ultimaInspecao)) current.ultimaInspecao = inspecao.dataInspecao;
    fleets.set(key, current);
  });

  return [...fleets.values()].sort((a, b) => b.ocorrencias - a.ocorrencias || a.numeroFrota.localeCompare(b.numeroFrota, "pt-BR"));
}

function periodLabel(period) {
  if (period === "LAST_30_DAYS") return "Ultimos 30 dias";
  if (period === "LAST_90_DAYS") return "Ultimos 90 dias";
  if (period === "CUSTOM") return "Periodo personalizado";
  return "Este mes";
}

export default function RecorrenciaDetalhePage() {
  const navigate = useNavigate();
  const { categoria = "Recorrencia" } = useParams();
  const [searchParams] = useSearchParams();
  const title = decodeURIComponent(categoria);
  const labels = (searchParams.get("labels") ?? title).split("|").map((item) => item.trim()).filter(Boolean);
  const period = searchParams.get("period") ?? "THIS_MONTH";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const [inspecoes, setInspecoes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    void listInspecoes()
      .then((response) => setInspecoes(response.inspecoes ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar recorrencia"))
      .finally(() => setLoading(false));
  }, []);

  const periodInspecoes = useMemo(() => filterByPeriod(inspecoes, period, from, to), [inspecoes, period, from, to]);
  const fleets = useMemo(() => buildFleetOccurrences(periodInspecoes, labels), [periodInspecoes, labels.join("|")]);
  const filteredFleets = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return fleets;
    return fleets.filter((frota) => normalizeText([frota.numeroFrota, frota.placa, frota.tipoEquipamento].join(" ")).includes(query));
  }, [fleets, search]);
  const totalOcorrencias = fleets.reduce((sum, frota) => sum + frota.ocorrencias, 0);
  const totalInspecoes = fleets.reduce((sum, frota) => sum + frota.inspecoes, 0);

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame recurrence-page",
      children: [
        _jsx(AppHeader, { title: title, subtitle: "Frotas e inspecoes relacionadas a esta recorrencia.", showBack: true }),
        error ? _jsx("p", { className: "notice notice--error", children: error }) : null,
        loading ? _jsx("p", { className: "helper", children: "Carregando..." }) : null,
        _jsxs(Card, {
          className: "section-card card--elevated",
          children: [
            _jsxs("div", {
              className: "recurrence-summary",
              children: [
                _jsxs("article", { children: [_jsx("span", { children: "Frotas" }), _jsx("strong", { children: fleets.length })] }),
                _jsxs("article", { children: [_jsx("span", { children: "Ocorrencias" }), _jsx("strong", { children: totalOcorrencias })] }),
                _jsxs("article", { children: [_jsx("span", { children: "Inspecoes" }), _jsx("strong", { children: totalInspecoes })] }),
                _jsxs("article", { children: [_jsx("span", { children: "Periodo" }), _jsx("strong", { children: periodLabel(period) })] })
              ]
            }),
            _jsx(Input, { label: "Buscar frota", value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Frota, placa ou tipo" })
          ]
        }),
        _jsx("div", {
          className: "recurrence-fleet-list",
          children: filteredFleets.map((frota) =>
            _jsxs(
              Card,
              {
                className: "recurrence-fleet-card",
                children: [
                  _jsxs("div", {
                    className: "recurrence-fleet-card__head",
                    children: [
                      _jsxs("div", {
                        children: [
                          _jsx("p", { className: "card-label", children: "Frota" }),
                          _jsx("h2", { className: "section-title", children: frota.numeroFrota }),
                          _jsxs("p", { className: "helper", children: ["Placa: ", frota.placa, " | ", frota.tipoEquipamento] })
                        ]
                      }),
                      _jsxs("span", { className: "status status--danger", children: [frota.ocorrencias, " ocorrencias"] })
                    ]
                  }),
                  _jsxs("div", { className: "recurrence-fleet-card__meta", children: [_jsxs("p", { className: "helper", children: [frota.inspecoes, " inspecoes com esta recorrencia"] }), _jsxs("p", { className: "helper", children: ["Ultima ocorrencia: ", formatDate(frota.ultimaInspecao)] })] }),
                  _jsx("div", {
                    className: "recurrence-point-list",
                    children: frota.pontos.slice(0, 4).map((ponto, index) =>
                      _jsxs("div", { className: "recurrence-point", children: [_jsxs("strong", { children: [ponto.localizacao, " | ", ponto.severidade] }), _jsx("small", { children: formatDate(ponto.dataInspecao) })] }, `${ponto.inspecaoId}-${index}`)
                    )
                  }),
                  _jsxs("div", {
                    className: "detail-actions",
                    children: [
                      _jsx(Button, { type: "button", variant: "secondary", disabled: !frota.id, onClick: () => navigate(`/frotas/${frota.id}/historico`), children: "Abrir historico da frota" }),
                      _jsx(Button, { type: "button", variant: "ghost", onClick: () => navigate(`/historico?frota=${encodeURIComponent(frota.numeroFrota)}`), children: "Ver inspecoes" })
                    ]
                  })
                ]
              },
              frota.id || frota.numeroFrota
            )
          )
        }),
        !loading && filteredFleets.length === 0 ? _jsx("p", { className: "helper", children: "Nenhuma frota encontrada para esta recorrencia." }) : null
      ]
    })
  });
}
