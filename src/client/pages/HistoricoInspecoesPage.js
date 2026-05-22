import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deleteInspecao, getInspecaoById, listInspecoes } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { openWhatsAppInspectionMessage } from "../utils/whatsapp";

function formatDate(value) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function normalizeText(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function formatTipoInspecao(value) {
  return value === "APOS_LAVAGEM" ? "Pós-Lavagem" : "Pré-Lavagem";
}

function formatMotivo(value) {
  const labels = {
    FERRUGEM: "Ferrugem",
    MANCHA: "Mancha",
    AMARELAMENTO: "Amarelamento",
    ODOR: "Odor",
    PRODUTO_RESIDUAL: "Produto residual",
    VALVULA_CONTAMINADA: "Válvula contaminada",
    OUTRO: "Outro"
  };
  return value ? labels[value] ?? value : "";
}

function buildSearchText(inspecao) {
  return normalizeText([
    inspecao.frota?.numeroFrota ?? "",
    inspecao.frota?.placa ?? "",
    inspecao.tipoInspecao ?? "",
    inspecao.colaborador?.nome ?? "",
    inspecao.resultadoPosLavagem ?? "",
    inspecao.motivoNaoConformidade ?? "",
    formatDate(inspecao.dataInspecao),
    formatTime(inspecao.dataInspecao)
  ].join(" "));
}

function hasCriticalPoint(inspecao) {
  return (inspecao.pontosCriticos ?? []).length > 0;
}

function hasPhotos(inspecao) {
  return (inspecao.pontosCriticos ?? []).some((ponto) => (ponto.fotos ?? []).length > 0);
}

export default function HistoricoInspecoesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFrotaSearch = searchParams.get("frota") ?? "";
  const [searchInput, setSearchInput] = useState(initialFrotaSearch);
  const [searchQuery, setSearchQuery] = useState(initialFrotaSearch);
  const [tipoFilter, setTipoFilter] = useState("TODAS");
  const [showCritical, setShowCritical] = useState(false);
  const [showWithoutCritical, setShowWithoutCritical] = useState(false);
  const [showWithPhotos, setShowWithPhotos] = useState(false);
  const [inspecoes, setInspecoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await listInspecoes();
      setInspecoes(response.inspecoes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar histórico");
      setInspecoes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredInspecoes = useMemo(() => {
    const query = normalizeText(searchQuery);
    return inspecoes.filter((inspecao) => {
      const textMatches = !query || buildSearchText(inspecao).includes(query);
      const criticalMatches = !showCritical || hasCriticalPoint(inspecao);
      const withoutCriticalMatches = !showWithoutCritical || !hasCriticalPoint(inspecao);
      const photosMatches = !showWithPhotos || hasPhotos(inspecao);
      const tipoMatches = tipoFilter === "TODAS" || inspecao.tipoInspecao === tipoFilter;
      return textMatches && criticalMatches && withoutCriticalMatches && photosMatches && tipoMatches;
    });
  }, [inspecoes, searchQuery, tipoFilter, showCritical, showWithoutCritical, showWithPhotos]);

  async function handleDelete(id) {
    const confirmed = window.confirm("Excluir inspeção?");
    if (!confirmed) return;
    await deleteInspecao(id);
    setInspecoes((current) => current.filter((item) => item.id !== id));
  }

  async function handleOpenWhatsApp(id) {
    const response = await getInspecaoById(id);
    await openWhatsAppInspectionMessage(response.inspecao);
  }

  function handleClear() {
    setSearchInput("");
    setSearchQuery("");
    setTipoFilter("TODAS");
    setShowCritical(false);
    setShowWithoutCritical(false);
    setShowWithPhotos(false);
  }

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame history-page",
      children: [
        _jsx(AppHeader, { title: "Histórico de inspeções", subtitle: "Busque e abra inspeções salvas.", showBack: true }),
        _jsxs(Card, {
          className: "section-card search-card history-search-panel",
          children: [
            _jsxs("div", { children: [_jsx("p", { className: "history-section-label", children: "Busca rápida" }), _jsx("h2", { className: "history-filter-title", children: "Busca rápida" })] }),
            _jsx("div", { className: "search-bar", children: _jsx(Input, { className: "history-search-input", label: "Busque pela frota, placa, colaborador ou data", value: searchInput, onChange: (event) => setSearchInput(event.target.value), placeholder: "Busque pela frota, placa, colaborador ou data" }) }),
            _jsxs("div", { children: [_jsx("p", { className: "history-section-label", children: "Tipo de inspeção" }), _jsxs("div", { className: "history-filter-chips", children: [_jsx("button", { type: "button", className: `history-filter-chip ${tipoFilter === "TODAS" ? "history-filter-chip--active" : ""}`, onClick: () => setTipoFilter("TODAS"), children: "Todas" }), _jsx("button", { type: "button", className: `history-filter-chip ${tipoFilter === "ANTES_LAVAGEM" ? "history-filter-chip--active" : ""}`, onClick: () => setTipoFilter("ANTES_LAVAGEM"), children: "Pré-Lavagem" }), _jsx("button", { type: "button", className: `history-filter-chip ${tipoFilter === "APOS_LAVAGEM" ? "history-filter-chip--active" : ""}`, onClick: () => setTipoFilter("APOS_LAVAGEM"), children: "Pós-Lavagem" })] })] }),
            _jsxs("div", { children: [_jsx("p", { className: "history-section-label", children: "Filtros" }), _jsxs("div", { className: "history-filter-chips", children: [_jsxs("label", { className: "history-filter-chip", children: [_jsx("input", { type: "checkbox", checked: showCritical, onChange: (event) => { setShowCritical(event.target.checked); if (event.target.checked) setShowWithoutCritical(false); } }), _jsx("span", { children: "Com ponto crítico" })] }), _jsxs("label", { className: "history-filter-chip", children: [_jsx("input", { type: "checkbox", checked: showWithoutCritical, onChange: (event) => { setShowWithoutCritical(event.target.checked); if (event.target.checked) setShowCritical(false); } }), _jsx("span", { children: "Sem ponto crítico" })] }), _jsxs("label", { className: "history-filter-chip", children: [_jsx("input", { type: "checkbox", checked: showWithPhotos, onChange: (event) => setShowWithPhotos(event.target.checked) }), _jsx("span", { children: "Com fotos" })] })] })] }),
            _jsxs("div", { className: "history-action-row", children: [_jsx(Button, { type: "button", onClick: () => setSearchQuery(searchInput), children: "Confirmar busca" }), _jsx(Button, { type: "button", variant: "secondary", onClick: handleClear, children: "Limpar" })] }),
            error ? _jsx("p", { className: "notice notice--error", children: error }) : null,
            loading ? _jsx("p", { className: "helper", children: "Carregando..." }) : null
          ]
        }),
        _jsxs("section", {
          className: "page-stack",
          children: [
            _jsx("div", {
              className: "history-list",
              children: filteredInspecoes.map((inspecao) => {
                const isPostWash = inspecao.tipoInspecao === "APOS_LAVAGEM";
                const result = inspecao.resultadoPosLavagem ?? inspecao.status;
                return _jsxs("article", {
                  className: "history-item history-inspection-card",
                  children: [
                    _jsxs("div", { className: "history-item__top", children: [_jsxs("div", { className: "history-inspection-card__meta", children: [_jsxs("h3", { className: "history-inspection-card__title", children: ["Frota ", inspecao.frota?.numeroFrota ?? "Não informada"] }), _jsxs("p", { className: "history-inspection-card__subtitle", children: ["Placa: ", inspecao.frota?.placa ?? "Não informada"] }), _jsxs("p", { className: "history-inspection-card__date", children: [formatDate(inspecao.dataInspecao), " • ", formatTime(inspecao.dataInspecao)] }), _jsxs("p", { className: "history-inspection-card__subtitle", children: ["Tipo: ", formatTipoInspecao(inspecao.tipoInspecao)] }), isPostWash ? _jsxs("p", { className: "history-inspection-card__subtitle", children: ["Colaborador: ", inspecao.colaborador?.nome ?? "Não informado", " • Resultado: ", result] }) : null, isPostWash && inspecao.motivoNaoConformidade ? _jsxs("p", { className: "history-inspection-card__subtitle", children: ["Não conformidade: ", formatMotivo(inspecao.motivoNaoConformidade)] }) : null] }), _jsx("span", { className: `status ${result === "REPROVADO" ? "status--danger" : "status--success"}`, children: isPostWash ? result : `${inspecao.pontosCriticos.length} pontos críticos` })] }),
                    _jsxs("div", { className: "history-inspection-card__actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate(`/inspecao/${inspecao.id}`), children: "Abrir inspeção" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => void handleDelete(inspecao.id), children: "Excluir inspeção" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => void handleOpenWhatsApp(inspecao.id), "aria-label": "Abrir no WhatsApp", children: _jsx("span", { "aria-hidden": "true", children: "🟢" }) })] })
                  ]
                }, inspecao.id);
              })
            }),
            !loading && filteredInspecoes.length === 0 ? _jsx("p", { className: "helper", children: "Nenhuma inspeção encontrada." }) : null
          ]
        })
      ]
    })
  });
}
