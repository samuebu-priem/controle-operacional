import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { listPostWashInspections } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { openPostWashWhatsAppMessage } from "../utils/whatsapp";

function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function HistoricoPosLavagemPage() {
  const [filters, setFilters] = useState({ frota: "", colaborador: "", resultado: "", from: "", to: "" });
  const [inspecoes, setInspecoes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await listPostWashInspections(filters);
      setInspecoes(response.inspecoes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar historico");
      setInspecoes([]);
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

  function clear() {
    setFilters({ frota: "", colaborador: "", resultado: "", from: "", to: "" });
  }

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame",
      children: [
        _jsx(AppHeader, { title: "Historico pos-lavagem", subtitle: "Consulta de aprovacoes, reprovacoes e nao conformidades.", showBack: true }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Filtros" }), _jsx("h2", { className: "section-title", children: "Consultar inspeções" })] }) }),
            _jsxs("div", {
              className: "form-grid form-grid--three",
              children: [
                _jsx(Input, { label: "Frota", value: filters.frota, onChange: (event) => patch({ frota: event.target.value }) }),
                _jsx(Input, { label: "Colaborador", value: filters.colaborador, onChange: (event) => patch({ colaborador: event.target.value }) }),
                _jsxs(Select, { label: "Resultado", value: filters.resultado, onChange: (event) => patch({ resultado: event.target.value }), children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "APROVADO", children: "APROVADO" }), _jsx("option", { value: "REPROVADO", children: "REPROVADO" })] }),
                _jsx(Input, { label: "Inicio", type: "date", value: filters.from, onChange: (event) => patch({ from: event.target.value }) }),
                _jsx(Input, { label: "Fim", type: "date", value: filters.to, onChange: (event) => patch({ to: event.target.value }) })
              ]
            }),
            _jsxs("div", { className: "inline-actions", children: [_jsx(Button, { type: "button", onClick: () => void load(), children: "Aplicar filtros" }), _jsx(Button, { type: "button", variant: "secondary", onClick: clear, children: "Limpar" })] }),
            error ? _jsx("p", { className: "notice notice--error", children: error }) : null,
            loading ? _jsx("p", { className: "helper", children: "Carregando..." }) : null
          ]
        }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Historico" }), _jsxs("h2", { className: "section-title", children: [inspecoes.length, " registros"] })] }) }),
            _jsx("div", {
              className: "quality-table-wrap",
              children: _jsxs("table", {
                className: "quality-report-table",
                children: [
                  _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Frota" }), _jsx("th", { children: "Data" }), _jsx("th", { children: "Colaborador" }), _jsx("th", { children: "Resultado" }), _jsx("th", { children: "Motivo" }), _jsx("th", { children: "Inspetor" }), _jsx("th", { children: "Acoes" })] }) }),
                  _jsx("tbody", { children: inspecoes.map((item) => _jsxs("tr", { children: [_jsx("td", { children: item.frota }), _jsx("td", { children: formatDateTime(item.createdAt) }), _jsx("td", { children: item.colaborador?.nome ?? "Nao informado" }), _jsx("td", { children: _jsx("span", { className: `quality-pill quality-pill--${item.resultado.toLowerCase()}`, children: item.resultado }) }), _jsx("td", { children: item.motivoLabel ?? "-" }), _jsx("td", { children: item.inspetor }), _jsx("td", { children: _jsx(Button, { type: "button", variant: "secondary", onClick: () => setSelected(item), children: "Abrir" }) })] }, item.id)) })
                ]
              })
            }),
            !loading && inspecoes.length === 0 ? _jsx("p", { className: "helper", children: "Nenhuma inspeção encontrada." }) : null
          ]
        }),
        selected
          ? _jsx("div", { className: "modal-overlay", role: "presentation", onClick: () => setSelected(null), children: _jsxs("div", { className: "modal", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation(), children: [_jsx("div", { className: "modal__header", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Detalhe da inspecao" }), _jsxs("h2", { className: "modal__title", children: ["Frota ", selected.frota] })] }) }), _jsxs("div", { className: "summary-list", children: [_jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Data/Hora:" }), " ", formatDateTime(selected.createdAt)] }), _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Inspetor:" }), " ", selected.inspetor] }), _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Colaborador:" }), " ", selected.colaborador?.nome ?? "Nao informado"] }), _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Resultado:" }), " ", selected.resultado] }), selected.resultado === "REPROVADO" ? _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Nao conformidade:" }), " ", selected.motivoLabel] }) : null, _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Observacao:" }), " ", selected.observacao ?? "Sem observacao"] })] }), _jsxs("div", { className: "modal__actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => openPostWashWhatsAppMessage(selected), children: "Compartilhar WhatsApp" }), _jsx(Button, { type: "button", onClick: () => setSelected(null), children: "Fechar" })] })] }) })
          : null
      ]
    })
  });
}
