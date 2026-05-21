import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createCollaborator, listCollaborators, updateCollaborator } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

export default function ColaboradoresPage() {
  const [search, setSearch] = useState("");
  const [colaboradores, setColaboradores] = useState([]);
  const [editing, setEditing] = useState(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await listCollaborators(search);
      setColaboradores(response.colaboradores);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar colaboradores");
      setColaboradores([]);
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
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const response = await updateCollaborator(editing.id, { nome, ativo });
        setColaboradores((current) => current.map((item) => (item.id === editing.id ? response.colaborador : item)));
      } else {
        const response = await createCollaborator({ nome, ativo });
        setColaboradores((current) => [...current, response.colaborador].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      }
      openCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar colaborador");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(colaborador) {
    setError("");
    try {
      const response = await updateCollaborator(colaborador.id, { ativo: false });
      setColaboradores((current) => current.map((item) => (item.id === colaborador.id ? response.colaborador : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao desativar colaborador");
    }
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
            _jsxs("div", { className: "inline-actions", children: [_jsx(Button, { type: "button", onClick: () => void save(), disabled: saving, children: saving ? "Salvando..." : "Salvar colaborador" }), _jsx(Button, { type: "button", variant: "secondary", onClick: openCreate, children: "Novo cadastro" })] }),
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
              children: filtered.map((colaborador) =>
                _jsxs("article", {
                  className: "frota-card",
                  children: [
                    _jsxs("div", { className: "frota-card__top", children: [_jsxs("div", { children: [_jsx("p", { className: "frota-card__label", children: "Colaborador" }), _jsx("h3", { className: "frota-card__title", children: colaborador.nome })] }), _jsx("span", { className: `status ${colaborador.ativo ? "status--success" : "status--danger"}`, children: colaborador.ativo ? "Ativo" : "Inativo" })] }),
                    _jsxs("div", { className: "frota-card__actions", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => openEdit(colaborador), children: "Editar" }), colaborador.ativo ? _jsx(Button, { type: "button", variant: "danger", onClick: () => void deactivate(colaborador), children: "Desativar" }) : _jsx(Button, { type: "button", variant: "secondary", onClick: () => void updateCollaborator(colaborador.id, { ativo: true }).then((response) => setColaboradores((current) => current.map((item) => (item.id === colaborador.id ? response.colaborador : item)))), children: "Reativar" })] })
                  ]
                }, colaborador.id)
              )
            }),
            !loading && filtered.length === 0 ? _jsx("p", { className: "helper", children: "Nenhum colaborador encontrado." }) : null
          ]
        })
      ]
    })
  });
}
