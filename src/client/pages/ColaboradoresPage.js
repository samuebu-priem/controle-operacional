import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createCollaborator, listCollaborators, listInspecoes, updateCollaborator } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

const motivoLabels = {
  FERRUGEM: "Ferrugem",
  MANCHA: "Mancha",
  AMARELAMENTO: "Amarelamento",
  ODOR: "Odor",
  PRODUTO_RESIDUAL: "Produto residual",
  VALVULA_CONTAMINADA: "Válvula contaminada",
  OUTRO: "Outro"
};

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function buildCollaboratorStats(colaborador, inspecoes) {
  const colaboradorInspecoes = inspecoes.filter(
    (inspecao) => inspecao.tipoInspecao === "APOS_LAVAGEM" && inspecao.colaboradorId === colaborador.id
  );
  const total = colaboradorInspecoes.length;
  const aprovadas = colaboradorInspecoes.filter((inspecao) => inspecao.resultadoPosLavagem === "APROVADO").length;
  const reprovadas = colaboradorInspecoes.filter((inspecao) => inspecao.resultadoPosLavagem === "REPROVADO").length;
  const taxaAprovacao = total > 0 ? (aprovadas / total) * 100 : 0;
  const motivoMap = new Map();

  colaboradorInspecoes.forEach((inspecao) => {
    if (!inspecao.motivoNaoConformidade) return;
    motivoMap.set(inspecao.motivoNaoConformidade, (motivoMap.get(inspecao.motivoNaoConformidade) ?? 0) + 1);
  });

  const naoConformidades = Array.from(motivoMap.entries())
    .map(([motivo, quantidade]) => ({
      motivo,
      label: motivoLabels[motivo] ?? motivo,
      quantidade,
      percentual: reprovadas > 0 ? (quantidade / reprovadas) * 100 : 0
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.label.localeCompare(b.label, "pt-BR"));

  const principal = naoConformidades[0] ?? null;

  return {
    total,
    aprovadas,
    reprovadas,
    taxaAprovacao,
    totalNaoConformidades: naoConformidades.reduce((sum, item) => sum + item.quantidade, 0),
    naoConformidades,
    principal
  };
}

export default function ColaboradoresPage() {
  const [search, setSearch] = useState("");
  const [colaboradores, setColaboradores] = useState([]);
  const [inspecoes, setInspecoes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [colaboradoresResponse, inspecoesResponse] = await Promise.all([listCollaborators(search), listInspecoes()]);
      setColaboradores(colaboradoresResponse.colaboradores);
      setInspecoes(inspecoesResponse.inspecoes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar colaboradores");
      setColaboradores([]);
      setInspecoes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return colaboradores;
    return colaboradores.filter((item) => item.nome.toLowerCase().includes(query));
  }, [colaboradores, search]);

  function openCreate() {
    setEditing(null);
    setNome("");
    setAtivo(true);
  }

  function openEdit(colaborador) {
    setEditing(colaborador);
    setNome(colaborador.nome);
    setAtivo(colaborador.ativo);
  }

  async function save() {
    if (!nome.trim()) {
      setError("Informe o nome do colaborador.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editing) {
        const response = await updateCollaborator(editing.id, { nome: nome.trim(), ativo });
        setColaboradores((current) => current.map((item) => (item.id === editing.id ? response.colaborador : item)));
        setSelectedProfile((current) => (current?.id === editing.id ? response.colaborador : current));
      } else {
        const response = await createCollaborator({ nome: nome.trim(), ativo });
        setColaboradores((current) => [...current, response.colaborador].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      }
      openCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar colaborador");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(colaborador, ativoValue) {
    setError("");
    try {
      const response = await updateCollaborator(colaborador.id, { ativo: ativoValue });
      setColaboradores((current) => current.map((item) => (item.id === colaborador.id ? response.colaborador : item)));
      setSelectedProfile((current) => (current?.id === colaborador.id ? response.colaborador : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar colaborador");
    }
  }

  function renderProfile(colaborador) {
    const stats = buildCollaboratorStats(colaborador, inspecoes);
    const pontoAtencao = stats.principal
      ? `Ponto de atenção: maior recorrência em ${stats.principal.label}, com ${stats.principal.quantidade} registros nas inspeções pós-lavagem.`
      : "Sem ponto de atenção identificado. Colaborador sem não conformidades registradas no período.";

    return _jsx("div", {
      className: "modal-overlay",
      role: "dialog",
      "aria-modal": "true",
      children: _jsxs("div", {
        className: "modal collaborator-profile-modal",
        children: [
          _jsxs("div", {
            className: "modal__header",
            children: [
              _jsxs("div", {
                children: [
                  _jsx("p", { className: "card-label", children: "Perfil do colaborador" }),
                  _jsx("h2", { className: "modal__title", children: colaborador.nome })
                ]
              }),
              _jsx(Button, { type: "button", variant: "ghost", onClick: () => setSelectedProfile(null), children: "Fechar" })
            ]
          }),
          _jsxs("div", {
            className: "quality-kpis collaborator-profile-kpis",
            children: [
              _jsxs("article", { className: "quality-kpi", children: [_jsx("span", { children: "Inspeções pós-lavagem" }), _jsx("strong", { children: stats.total })] }),
              _jsxs("article", { className: "quality-kpi", children: [_jsx("span", { children: "Aprovadas" }), _jsx("strong", { children: stats.aprovadas })] }),
              _jsxs("article", { className: "quality-kpi", children: [_jsx("span", { children: "Reprovadas" }), _jsx("strong", { children: stats.reprovadas })] }),
              _jsxs("article", { className: "quality-kpi", children: [_jsx("span", { children: "Taxa de aprovação" }), _jsx("strong", { children: formatPercent(stats.taxaAprovacao) })] })
            ]
          }),
          _jsxs("div", {
            className: "recurrence-summary collaborator-profile-summary",
            children: [
              _jsxs("article", { children: [_jsx("span", { children: "Não conformidades" }), _jsx("strong", { children: stats.totalNaoConformidades })] }),
              _jsxs("article", { children: [_jsx("span", { children: "Principal ponto de atenção" }), _jsx("strong", { children: stats.principal?.label ?? "Sem recorrência" })] })
            ]
          }),
          _jsxs("section", {
            className: "collaborator-profile-section",
            children: [
              _jsx("h3", { className: "section-title", children: "Principais não conformidades" }),
              stats.naoConformidades.length > 0
                ? _jsx("div", {
                    className: "collaborator-failure-list",
                    children: stats.naoConformidades.map((item) =>
                      _jsxs("article", {
                        className: "collaborator-failure-item",
                        children: [
                          _jsxs("div", { children: [_jsx("strong", { children: item.label }), _jsxs("span", { children: [item.quantidade, item.quantidade === 1 ? " ocorrência" : " ocorrências"] })] }),
                          _jsx("span", { className: "status status--warning", children: formatPercent(item.percentual) })
                        ]
                      }, item.motivo)
                    )
                  })
                : _jsx("p", { className: "helper", children: "Sem não conformidades registradas para este colaborador." })
            ]
          }),
          _jsx("p", { className: "notice notice--info", children: pontoAtencao })
        ]
      })
    });
  }

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame",
      children: [
        _jsx(AppHeader, { title: "Colaboradores", subtitle: "Cadastro de lavadores para indicadores de qualidade.", showBack: true }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Cadastro" }), _jsx("h2", { className: "section-title", children: editing ? "Editar colaborador" : "Novo colaborador" })] }) }),
            _jsxs("div", {
              className: "form-grid form-grid--two",
              children: [
                _jsx(Input, { label: "Nome", value: nome, onChange: (event) => setNome(event.target.value), placeholder: "Nome do colaborador" }),
                _jsxs("label", { className: "input-field", children: [_jsx("span", { className: "input-field__label", children: "Status" }), _jsxs("select", { className: "select", value: ativo ? "true" : "false", onChange: (event) => setAtivo(event.target.value === "true"), children: [_jsx("option", { value: "true", children: "Ativo" }), _jsx("option", { value: "false", children: "Inativo" })] })] })
              ]
            }),
            _jsxs("div", {
              className: "inline-actions",
              children: [
                _jsx(Button, { type: "button", onClick: () => void save(), disabled: saving, children: saving ? "Salvando..." : "Salvar colaborador" }),
                editing ? _jsx(Button, { type: "button", variant: "secondary", onClick: openCreate, children: "Cancelar edição" }) : _jsx(Button, { type: "button", variant: "secondary", onClick: openCreate, children: "Novo cadastro" })
              ]
            }),
            error ? _jsx("p", { className: "notice notice--error", children: error }) : null
          ]
        }),
        _jsxs(Card, {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Pesquisa" }), _jsx("h2", { className: "section-title", children: "Listagem de colaboradores" })] }) }),
            _jsxs("div", { className: "search-bar", children: [_jsx(Input, { label: "Pesquisar por nome", value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Digite parte do nome" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => void load(), children: "Atualizar" })] }),
            loading ? _jsx("p", { className: "helper", children: "Carregando..." }) : null,
            _jsx("div", {
              className: "history-list",
              children: filtered.map((colaborador) => {
                const stats = buildCollaboratorStats(colaborador, inspecoes);
                return _jsxs("article", {
                  className: "frota-card collaborator-card",
                  role: "button",
                  tabIndex: 0,
                  onClick: () => setSelectedProfile(colaborador),
                  onKeyDown: (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedProfile(colaborador);
                    }
                  },
                  children: [
                    _jsxs("div", { className: "frota-card__top", children: [_jsxs("div", { children: [_jsx("p", { className: "frota-card__label", children: "Colaborador" }), _jsx("h3", { className: "frota-card__title", children: colaborador.nome })] }), _jsx("span", { className: `status ${colaborador.ativo ? "status--success" : "status--danger"}`, children: colaborador.ativo ? "Ativo" : "Inativo" })] }),
                    _jsxs("div", {
                      className: "recurrence-summary collaborator-card-summary",
                      children: [
                        _jsxs("article", { children: [_jsx("span", { children: "Inspeções" }), _jsx("strong", { children: stats.total })] }),
                        _jsxs("article", { children: [_jsx("span", { children: "Taxa de aprovação" }), _jsx("strong", { children: formatPercent(stats.taxaAprovacao) })] }),
                        _jsxs("article", { children: [_jsx("span", { children: "Principal não conformidade" }), _jsx("strong", { children: stats.principal?.label ?? "Sem recorrência" })] })
                      ]
                    }),
                    _jsxs("div", {
                      className: "frota-card__actions",
                      children: [
                        _jsx(Button, { type: "button", variant: "secondary", onClick: (event) => { event.stopPropagation(); setSelectedProfile(colaborador); }, children: "Ver perfil" }),
                        _jsx(Button, { type: "button", variant: "ghost", onClick: (event) => { event.stopPropagation(); openEdit(colaborador); }, children: "Editar" }),
                        colaborador.ativo
                          ? _jsx(Button, { type: "button", variant: "danger", onClick: (event) => { event.stopPropagation(); void updateStatus(colaborador, false); }, children: "Desativar" })
                          : _jsx(Button, { type: "button", variant: "secondary", onClick: (event) => { event.stopPropagation(); void updateStatus(colaborador, true); }, children: "Reativar" })
                      ]
                    })
                  ]
                }, colaborador.id);
              })
            }),
            !loading && filtered.length === 0 ? _jsx("p", { className: "helper", children: "Nenhum colaborador encontrado." }) : null
          ]
        }),
        selectedProfile ? renderProfile(selectedProfile) : null
      ]
    })
  });
}
