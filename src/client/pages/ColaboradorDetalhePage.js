import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCollaboratorPerformance } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/ui/Card";

function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function percent(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function ColaboradorDetalhePage() {
  const { id = "" } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await getCollaboratorPerformance(id);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar indicadores");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  if (loading) {
    return _jsx(AppLayout, { children: _jsxs("div", { className: "page-frame", children: [_jsx(AppHeader, { title: "Indicadores do colaborador", subtitle: "Carregando desempenho de qualidade.", showBack: true }), _jsx(Card, { className: "section-card", children: _jsx("p", { className: "helper", children: "Carregando..." }) })] }) });
  }

  if (!data) {
    return _jsx(AppLayout, { children: _jsxs("div", { className: "page-frame", children: [_jsx(AppHeader, { title: "Indicadores do colaborador", subtitle: "Desenvolvimento profissional e melhoria continua.", showBack: true }), _jsx(Card, { className: "section-card", children: _jsx("p", { className: "notice notice--error", children: error || "Colaborador nao encontrado." }) })] }) });
  }

  const maxMonthly = Math.max(...data.evolucaoMensal.map((item) => item.total), 1);

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame",
      children: [
        _jsx(AppHeader, { title: data.colaborador.nome, subtitle: "Indicadores individuais de qualidade e pontos de atencao.", showBack: true }),
        _jsxs("section", { className: "home-summary-grid", children: [_jsxs("article", { className: "home-metric home-metric--blue", children: [_jsx("span", { children: "Inspecoes" }), _jsx("strong", { children: data.resumo.totalInspecoes }), _jsx("small", { children: "Total registrado" })] }), _jsxs("article", { className: "home-metric home-metric--green", children: [_jsx("span", { children: "Aprovadas" }), _jsx("strong", { children: data.resumo.aprovadas }), _jsx("small", { children: "Conformidade" })] }), _jsxs("article", { className: "home-metric home-metric--amber", children: [_jsx("span", { children: "Reprovadas" }), _jsx("strong", { children: data.resumo.reprovadas }), _jsx("small", { children: "Nao conformidades" })] }), _jsxs("article", { className: "home-metric home-metric--cyan", children: [_jsx("span", { children: "Taxa de aprovacao" }), _jsx("strong", { children: percent(data.resumo.taxaAprovacao) }), _jsx("small", { children: "Qualidade operacional" })] })] }),
        _jsxs(Card, { className: "section-card card--elevated", children: [_jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Tendencia" }), _jsx("h2", { className: "section-title", children: data.tendencia })] }) }), _jsx("p", { className: "helper", children: "A leitura considera a evolucao mensal disponivel e deve apoiar treinamento, acompanhamento e reducao de retrabalho." })] }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Nao conformidades" }), _jsx("h2", { className: "section-title", children: "Principais pontos de atencao" })] }) }),
            _jsx("div", { className: "recurrence-point-list", children: data.principaisNaoConformidades.map((item) => _jsxs("article", { className: "recurrence-point", children: [_jsx("strong", { children: item.motivoLabel }), _jsxs("small", { children: [item.quantidade, item.quantidade === 1 ? " ocorrencia" : " ocorrencias"] })] }, item.motivo)) }),
            data.principaisNaoConformidades.length === 0 ? _jsx("p", { className: "helper", children: "Sem nao conformidades registradas para este colaborador." }) : null
          ]
        }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Evolucao mensal" }), _jsx("h2", { className: "section-title", children: "Historico de qualidade" })] }) }),
            _jsx("div", { className: "performance-timeline", children: data.evolucaoMensal.map((item) => _jsxs("article", { children: [_jsx("strong", { children: item.periodo }), _jsx("div", { className: "performance-timeline__track", children: _jsx("span", { style: { width: `${(item.total / maxMonthly) * 100}%` } }) }), _jsxs("small", { children: [item.total, " inspeções | ", item.aprovadas, " aprovadas | ", item.reprovadas, " reprovadas"] })] }, item.periodo)) })
          ]
        }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Historico recente" }), _jsx("h2", { className: "section-title", children: "Ultimas ocorrencias registradas" })] }) }),
            _jsx("div", { className: "history-list", children: data.historicoRecente.map((item) => _jsxs("article", { className: "frota-card", children: [_jsxs("div", { className: "frota-card__top", children: [_jsxs("div", { children: [_jsx("p", { className: "frota-card__label", children: formatDateTime(item.createdAt) }), _jsxs("h3", { className: "frota-card__title", children: ["Frota ", item.frota] }), _jsxs("p", { className: "frota-card__meta", children: ["Inspetor: ", item.inspetor] })] }), _jsx("span", { className: `status ${item.resultado === "REPROVADO" ? "status--danger" : "status--success"}`, children: item.resultado })] }), item.motivoLabel ? _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Nao conformidade:" }), " ", item.motivoLabel] }) : null, _jsx("p", { className: "frota-card__line", children: item.observacao ?? "Sem observacao" })] }, item.id)) })
          ]
        })
      ]
    })
  });
}
