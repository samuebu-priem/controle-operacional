import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFrotaHistorico } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Sem data";
}

function formatStatus(status) {
  if (!status) return "Sem inspecao";
  return status.replaceAll("_", " ");
}

function buildCategoryRanking(inspecoes) {
  const map = new Map();
  inspecoes.forEach((inspecao) => {
    (inspecao.pontosCriticos ?? []).forEach((ponto) => {
      const key = ponto.categoria || "Nao informado";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function countFotos(inspecoes) {
  return inspecoes.reduce((total, inspecao) => {
    const fotosDiretas = (inspecao.fotos ?? []).length;
    const fotosPontos = (inspecao.pontosCriticos ?? []).reduce((sum, ponto) => sum + (ponto.fotos ?? []).length, 0);
    return total + fotosDiretas + fotosPontos;
  }, 0);
}

export default function FrotaHistoricoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    void getFrotaHistorico(id)
      .then((response) => setData(response))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar historico da frota"))
      .finally(() => setLoading(false));
  }, [id]);

  const inspecoes = data?.inspecoes ?? [];
  const frota = data?.frota ?? null;
  const ultimaInspecao = data?.ultimaInspecao ?? null;
  const ranking = useMemo(() => buildCategoryRanking(inspecoes), [inspecoes]);
  const totalPontos = inspecoes.reduce((sum, inspecao) => sum + (inspecao.pontosCriticos ?? []).length, 0);
  const totalFotos = countFotos(inspecoes);

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame frota-history-page",
      children: [
        _jsx(AppHeader, { title: frota ? `Frota ${frota.numeroFrota}` : "Historico da frota", subtitle: "Dados, ultimas inspecoes e recorrencias.", showBack: true }),
        error ? _jsx("p", { className: "notice notice--error", children: error }) : null,
        loading ? _jsx("p", { className: "helper", children: "Carregando..." }) : null,
        frota
          ? _jsxs(Card, {
              className: "section-card card--elevated",
              children: [
                _jsxs("div", {
                  className: "frota-history-hero",
                  children: [
                    _jsxs("div", {
                      children: [
                        _jsx("p", { className: "card-label", children: "Cadastro da frota" }),
                        _jsx("h2", { className: "section-title", children: frota.numeroFrota }),
                        _jsxs("p", { className: "helper", children: ["Placa: ", frota.placa, " | Tipo: ", frota.tipoEquipamento] })
                      ]
                    }),
                    _jsx("span", { className: `status ${ultimaInspecao?.status === "REPROVADO" ? "status--danger" : "status--success"}`, children: ultimaInspecao ? formatStatus(ultimaInspecao.status) : "SEM INSPECAO" })
                  ]
                }),
                _jsxs("div", {
                  className: "frota-history-kpis",
                  children: [
                    _jsxs("article", { children: [_jsx("span", { children: "Inspecoes" }), _jsx("strong", { children: inspecoes.length })] }),
                    _jsxs("article", { children: [_jsx("span", { children: "Pontos criticos" }), _jsx("strong", { children: totalPontos })] }),
                    _jsxs("article", { children: [_jsx("span", { children: "Fotos" }), _jsx("strong", { children: totalFotos })] }),
                    _jsxs("article", { children: [_jsx("span", { children: "Ultima inspecao" }), _jsx("strong", { children: ultimaInspecao ? formatDate(ultimaInspecao.dataInspecao) : "--" })] })
                  ]
                })
              ]
            })
          : null,
        frota
          ? _jsxs("div", {
              className: "frota-history-grid",
              children: [
                _jsxs(Card, {
                  className: "section-card",
                  children: [
                    _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Recorrencias" }), _jsx("h2", { className: "section-title", children: "Categorias mais frequentes" })] }) }),
                    ranking.length > 0
                      ? _jsx("div", { className: "frota-history-ranking", children: ranking.map(([categoria, count], index) => _jsxs("div", { className: "frota-history-ranking__item", children: [_jsx("span", { children: index + 1 }), _jsx("strong", { children: categoria }), _jsxs("small", { children: [count, " ocorrencias"] })] }, categoria)) })
                      : _jsx("p", { className: "helper", children: "Nenhuma recorrencia registrada." })
                  ]
                }),
                _jsxs(Card, {
                  className: "section-card",
                  children: [
                    _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Resumo" }), _jsx("h2", { className: "section-title", children: "Alerta da frota" })] }) }),
                    _jsx("p", { className: "helper", children: data?.resumoRecorrencia?.alerta ?? data?.resumoRecorrencia?.mensagemResumo ?? "Sem alerta para esta frota." }),
                    _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate(`/historico?frota=${encodeURIComponent(frota.numeroFrota)}`), children: "Abrir historico filtrado" })
                  ]
                })
              ]
            })
          : null,
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Inspecoes" }), _jsxs("h2", { className: "section-title", children: [inspecoes.length, " registros"] })] }) }),
            _jsx("div", {
              className: "history-list",
              children: inspecoes.map((inspecao) =>
                _jsxs(
                  "article",
                  {
                    className: "history-item",
                    children: [
                      _jsxs("div", {
                        className: "history-item__top",
                        children: [
                          _jsxs("div", { children: [_jsx("h3", { className: "section-title", children: formatDate(inspecao.dataInspecao) }), _jsx("p", { className: "product-loaded", children: `Produto: ${inspecao.product?.name ?? "Registro legado"}` }), _jsx("p",{className:"helper",children:`Procedimento: ${{WASH_ONLY:"Lavagem sem vapor",STEAM_ONLY:"Somente vapor",WASH_AND_STEAM:"Lavagem + vapor",NO_WASH_REQUIRED:"Não necessita lavagem",NOT_DEFINED:"Não definido"}[inspecao.productInspection?.productWashingProcedureSnapshot]??"Não definido"}`}), inspecao.productInspection?.productWashingNotesSnapshot?_jsx("p",{className:"helper",children:inspecao.productInspection.productWashingNotesSnapshot}):null, _jsxs("p", { className: "helper", children: ["Inspetor: ", inspecao.nomeInspetor, " · Lavador: ", inspecao.colaborador?.nome ?? "Não aplicável", " · Resultado: ", formatStatus(inspecao.status)] })] }),
                          _jsx("span", { className: `status ${inspecao.status === "REPROVADO" ? "status--danger" : "status--success"}`, children: formatStatus(inspecao.status) })
                        ]
                      }),
                      _jsxs("div", { className: "detail-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate(`/inspecao/${inspecao.id}`), children: "Abrir inspecao" })] })
                    ]
                  },
                  inspecao.id
                )
              )
            }),
            !loading && inspecoes.length === 0 ? _jsx("p", { className: "helper", children: "Nenhuma inspecao encontrada para esta frota." }) : null
          ]
        })
      ]
    })
  });
}
