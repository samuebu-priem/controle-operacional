import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPostWashDashboard, listCollaborators } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";

function percent(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function DashboardPosLavagemPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ colaboradorId: "", resultado: "", from: "", to: "" });
  const [colaboradores, setColaboradores] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [dashResponse, collabResponse] = await Promise.all([getPostWashDashboard(filters), listCollaborators()]);
      setDashboard(dashResponse);
      setColaboradores(collabResponse.colaboradores);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dashboard");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patch(value) {
    setFilters((current) => ({ ...current, ...value }));
  }

  const resumo = dashboard?.resumo ?? { totalInspecoes: 0, aprovadas: 0, reprovadas: 0, taxaAprovacao: 0 };
  const maxMotivo = Math.max(...(dashboard?.principaisMotivos ?? []).map((item) => item.quantidade), 1);
  const maxEvolucao = Math.max(...(dashboard?.evolucao ?? []).map((item) => item.total), 1);

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame",
      children: [
        _jsx(AppHeader, { title: "Dashboard pos-lavagem", subtitle: "Indicadores de qualidade, evolucao e pontos de atencao.", showBack: true }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Gestao operacional" }), _jsx("h2", { className: "section-title", children: "Filtros de analise" })] }) }),
            _jsxs("div", {
              className: "form-grid form-grid--four performance-filter-grid",
              children: [
                _jsxs(Select, { label: "Colaborador", value: filters.colaboradorId, onChange: (event) => patch({ colaboradorId: event.target.value }), children: [_jsx("option", { value: "", children: "Todos" }), colaboradores.map((item) => _jsx("option", { value: item.id, children: item.nome }, item.id))] }),
                _jsxs(Select, { label: "Resultado", value: filters.resultado, onChange: (event) => patch({ resultado: event.target.value }), children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "APROVADO", children: "APROVADO" }), _jsx("option", { value: "REPROVADO", children: "REPROVADO" })] }),
                _jsx(Input, { label: "Inicio", type: "date", value: filters.from, onChange: (event) => patch({ from: event.target.value }) }),
                _jsx(Input, { label: "Fim", type: "date", value: filters.to, onChange: (event) => patch({ to: event.target.value }) })
              ]
            }),
            _jsxs("div", { className: "inline-actions", children: [_jsx(Button, { type: "button", onClick: () => void load(), children: "Atualizar indicadores" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate("/pos-lavagem/nova"), children: "Nova inspeção" })] }),
            error ? _jsx("p", { className: "notice notice--error", children: error }) : null,
            loading ? _jsx("p", { className: "helper", children: "Carregando indicadores..." }) : null
          ]
        }),
        _jsxs("section", { className: "home-summary-grid", children: [_jsxs("article", { className: "home-metric home-metric--blue", children: [_jsx("span", { children: "Inspecoes" }), _jsx("strong", { children: resumo.totalInspecoes }), _jsx("small", { children: "Total analisado" })] }), _jsxs("article", { className: "home-metric home-metric--green", children: [_jsx("span", { children: "Aprovadas" }), _jsx("strong", { children: resumo.aprovadas }), _jsx("small", { children: "Qualidade conforme" })] }), _jsxs("article", { className: "home-metric home-metric--amber", children: [_jsx("span", { children: "Reprovadas" }), _jsx("strong", { children: resumo.reprovadas }), _jsx("small", { children: "Nao conformidades" })] }), _jsxs("article", { className: "home-metric home-metric--cyan", children: [_jsx("span", { children: "Taxa de aprovacao" }), _jsx("strong", { children: percent(resumo.taxaAprovacao) }), _jsx("small", { children: "Evolucao de qualidade" })] })] }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Pontos de atencao" }), _jsx("h2", { className: "section-title", children: "Principais nao conformidades" })] }) }),
            _jsx("div", { className: "performance-bars", children: (dashboard?.principaisMotivos ?? []).map((item) => _jsxs("div", { className: "performance-bar", children: [_jsx("span", { children: item.motivoLabel }), _jsx("div", { className: "performance-bar__track", children: _jsx("i", { style: { width: `${(item.quantidade / maxMotivo) * 100}%` } }) }), _jsx("strong", { children: item.quantidade })] }, item.motivo)) }),
            dashboard?.principaisMotivos?.length === 0 ? _jsx("p", { className: "helper", children: "Sem nao conformidades no periodo filtrado." }) : null
          ]
        }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Evolucao" }), _jsx("h2", { className: "section-title", children: "Inspecoes ao longo do tempo" })] }) }),
            _jsx("div", { className: "performance-timeline", children: (dashboard?.evolucao ?? []).map((item) => _jsxs("article", { children: [_jsx("strong", { children: item.periodo }), _jsx("div", { className: "performance-timeline__track", children: _jsx("span", { style: { width: `${(item.total / maxEvolucao) * 100}%` } }) }), _jsxs("small", { children: [item.total, " total | ", item.aprovadas, " aprovadas | ", item.reprovadas, " reprovadas"] })] }, item.periodo)) })
          ]
        }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Desenvolvimento profissional" }), _jsx("h2", { className: "section-title", children: "Indicadores por colaborador" })] }) }),
            _jsx("div", { className: "history-list", children: (dashboard?.indicadoresPorColaborador ?? []).map((item) => _jsxs("article", { className: "frota-card", children: [_jsxs("div", { className: "frota-card__top", children: [_jsxs("div", { children: [_jsx("p", { className: "frota-card__label", children: "Colaborador" }), _jsx("h3", { className: "frota-card__title", children: item.colaboradorNome }), _jsxs("p", { className: "frota-card__meta", children: ["Principal ponto de atencao: ", item.principalMotivoFalha?.motivoLabel ?? "Sem recorrencia"] })] }), _jsx("span", { className: "status status--success", children: percent(item.taxaAprovacao) })] }), _jsxs("div", { className: "recurrence-summary", children: [_jsxs("article", { children: [_jsx("span", { children: "Inspecoes" }), _jsx("strong", { children: item.totalInspecoes })] }), _jsxs("article", { children: [_jsx("span", { children: "Aprovacoes" }), _jsx("strong", { children: item.aprovacoes })] }), _jsxs("article", { children: [_jsx("span", { children: "Reprovacoes" }), _jsx("strong", { children: item.reprovacoes })] })] }), _jsx("div", { className: "frota-card__actions", children: _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate(`/colaboradores/${item.colaboradorId}`), children: "Ver evolucao" }) })] }, item.colaboradorId)) })
          ]
        })
      ]
    })
  });
}
