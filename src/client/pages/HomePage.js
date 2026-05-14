import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listInspecoes } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

function formatDate(value) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function normalizeCategory(value) {
  const text = String(value ?? "").trim();
  const key = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (key.includes("ferrugem")) return "Ferrugem";
  if (key.includes("resquicio")) return "Resquicio de produto";
  if (key.includes("fuligem") || key.includes("fulligem")) return "Fuligem";
  if (key.includes("amarelamento")) return "Amarelamento";
  if (key.includes("mancha")) return "Mancha";
  return text || "Sem categoria";
}

function buildHomeSummary(inspecoes) {
  const total = inspecoes.length;
  const withCritical = inspecoes.filter((inspecao) => (inspecao.pontosCriticos ?? []).length > 0).length;
  const approved = inspecoes.filter((inspecao) => inspecao.status === "APROVADO").length;
  const pendingRate = total > 0 ? Math.round(withCritical / total * 100) : 0;
  const approvedRate = total > 0 ? Math.round(approved / total * 100) : 0;
  const categoryCounts = new Map();

  for (const inspecao of inspecoes) {
    for (const ponto of inspecao.pontosCriticos ?? []) {
      const category = normalizeCategory(ponto.categoria);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  const categories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const totalOccurrences = categories.reduce((sum, [, count]) => sum + count, 0);
  const leadingCategory = categories[0]?.[0] ?? "Sem recorrencia";
  const recentInspections = [...inspecoes]
    .sort((a, b) => new Date(b.dataInspecao).getTime() - new Date(a.dataInspecao).getTime())
    .slice(0, 5);

  return {
    total,
    withCritical,
    approvedRate,
    pendingRate,
    categories,
    totalOccurrences,
    leadingCategory,
    recentInspections
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const [inspecoes, setInspecoes] = useState([]);
  const summary = buildHomeSummary(inspecoes);
  const donutStyle = {
    "--approved": `${summary.approvedRate}%`,
    "--critical": `${summary.pendingRate}%`
  };

  useEffect(() => {
    let active = true;

    async function loadInspecoes() {
      try {
        const response = await listInspecoes();
        if (active) setInspecoes(response.inspecoes);
      } catch {
        if (active) setInspecoes([]);
      }
    }

    void loadInspecoes();

    return () => {
      active = false;
    };
  }, []);

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame home-page",
      children: [
        _jsx(AppHeader, {
          title: "Controle Operacional",
          subtitle: "Resumo operacional das inspe\u00e7\u00f5es, qualidade e frotas."
        }),
        _jsxs("section", {
          className: "home-dashboard",
          children: [
            _jsxs(Card, {
              className: "home-hero-card card--elevated",
              children: [
                _jsxs("div", {
                  className: "home-hero-card__copy",
                  children: [
                    _jsx("p", { className: "card-label", children: "Painel inicial" }),
                    _jsx("h2", { children: "Resumo das operacoes" }),
                    _jsx("p", { children: "Acompanhe o volume de inspeções, recorrências de qualidade e os registros mais recentes sem sair da primeira tela." })
                  ]
                }),
                _jsxs("div", {
                  className: "home-hero-card__actions",
                  children: [
                    _jsx(Button, { type: "button", onClick: () => navigate("/inspecao-expressa"), children: "Inspecao expressa" }),
                    _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate("/nova-inspecao"), children: "Nova inspecao" })
                  ]
                })
              ]
            }),
            _jsxs("div", {
              className: "home-summary-grid",
              children: [
                _jsxs("article", { className: "home-metric", children: [_jsx("span", { children: "Inspecoes" }), _jsx("strong", { children: summary.total }), _jsx("small", { children: "registros no historico" })] }),
                _jsxs("article", { className: "home-metric", children: [_jsx("span", { children: "Com ponto critico" }), _jsx("strong", { children: summary.withCritical }), _jsxs("small", { children: [summary.pendingRate, "% das inspeções"] })] }),
                _jsxs("article", { className: "home-metric", children: [_jsx("span", { children: "Aprovacao" }), _jsxs("strong", { children: [summary.approvedRate, "%"] }), _jsx("small", { children: "sem reprovação" })] }),
                _jsxs("article", { className: "home-metric", children: [_jsx("span", { children: "Recorrencia lider" }), _jsx("strong", { children: summary.leadingCategory }), _jsx("small", { children: "categoria mais frequente" })] })
              ]
            }),
            _jsxs("div", {
              className: "home-content-grid",
              children: [
                _jsxs(Card, {
                  className: "home-quality-card",
                  children: [
                    _jsxs("div", { className: "home-card-head", children: [_jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Qualidade" }), _jsx("h3", { className: "section-title", children: "Resumo de recorrencias" })] }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate("/historico"), children: "Ver historico" })] }),
                    _jsxs("div", {
                      className: "home-quality-card__body",
                      children: [
                        _jsxs("div", { className: "home-quality-donut", style: donutStyle, children: [_jsx("strong", { children: summary.totalOccurrences }), _jsx("span", { children: "ocorrencias" })] }),
                        _jsx("div", {
                          className: "home-quality-list",
                          children: summary.categories.length > 0 ? summary.categories.map(([category, count]) => _jsxs("div", { children: [_jsx("span", { children: category }), _jsx("strong", { children: count })] }, category)) : _jsx("p", { className: "helper", children: "Sem ocorrências registradas." })
                        })
                      ]
                    })
                  ]
                }),
                _jsxs(Card, {
                  className: "home-recent-card",
                  children: [
                    _jsxs("div", { className: "home-card-head", children: [_jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Ultimas inspeções" }), _jsx("h3", { className: "section-title", children: "Movimento recente" })] }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate("/historico"), children: "Abrir lista" })] }),
                    _jsx("div", {
                      className: "home-recent-list",
                      children: summary.recentInspections.length > 0 ? summary.recentInspections.map((inspecao) => _jsxs("button", {
                        type: "button",
                        onClick: () => navigate(`/inspecao/${inspecao.id}`),
                        children: [
                          _jsxs("span", { children: [_jsx("strong", { children: `Frota ${inspecao.frota?.numeroFrota ?? inspecao.frotaId}` }), _jsx("small", { children: `${formatDate(inspecao.dataInspecao)} | ${inspecao.nomeInspetor}` })] }),
                          _jsx("em", { className: inspecao.status === "REPROVADO" ? "home-status home-status--danger" : "home-status", children: inspecao.status })
                        ]
                      }, inspecao.id)) : _jsx("p", { className: "helper", children: "Nenhuma inspeção registrada." })
                    })
                  ]
                })
              ]
            }),
            _jsxs("div", {
              className: "home-navigation-grid",
              children: [
                _jsxs("button", { type: "button", onClick: () => navigate("/historico"), children: [_jsx("strong", { children: "Historico" }), _jsx("span", { children: "Consultar, abrir e enviar inspeções." })] }),
                _jsxs("button", { type: "button", onClick: () => navigate("/registro-frotas"), children: [_jsx("strong", { children: "Frotas" }), _jsx("span", { children: "Cadastrar e revisar equipamentos." })] }),
                _jsxs("button", { type: "button", onClick: () => navigate("/perfil"), children: [_jsx("strong", { children: "Perfil" }), _jsx("span", { children: "Dados do inspetor e acesso." })] })
              ]
            })
          ]
        })
      ]
    })
  });
}
