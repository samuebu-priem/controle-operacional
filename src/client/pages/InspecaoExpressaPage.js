import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createInspecao, getFrotaByNumero } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input, { Textarea } from "../components/ui/Input";
import { getAuthUser } from "../utils/auth";

const TANK_TYPES = ["Tanque inox", "Tanque carbono", "Carreta tanque", "Bitrem tanque", "Isotank", "Outro"];

const QUICK_ISSUES = [
  {
    id: "residuo",
    label: "Residuo",
    categoria: "Resquicio de produto",
    localizacao: "Interior do tanque",
    descricao: "Residuo aparente encontrado na inspecao expressa.",
    procedimentoRecomendado: "Realizar limpeza e reinspecionar antes da liberacao."
  },
  {
    id: "ferrugem",
    label: "Ferrugem",
    categoria: "Ferrugem",
    localizacao: "Estrutura interna",
    descricao: "Ponto de ferrugem encontrado na inspecao expressa.",
    procedimentoRecomendado: "Avaliar tratamento do ponto e registrar acompanhamento."
  },
  {
    id: "mancha",
    label: "Mancha",
    categoria: "Mancha",
    localizacao: "Interior do tanque",
    descricao: "Mancha encontrada na inspecao expressa.",
    procedimentoRecomendado: "Identificar origem, limpar e reinspecionar."
  },
  {
    id: "odor",
    label: "Odor",
    categoria: "Resquicio de produto",
    localizacao: "Geral",
    descricao: "Odor ou evidencia de produto residual encontrado na inspecao expressa.",
    procedimentoRecomendado: "Repetir higienizacao e validar ausencia de odor."
  },
  {
    id: "fuligem",
    label: "Fuligem",
    categoria: "Fuligem",
    localizacao: "Superficie do tanque",
    descricao: "Fuligem encontrada na inspecao expressa.",
    procedimentoRecomendado: "Realizar limpeza localizada e reinspecionar."
  },
  {
    id: "amarelamento",
    label: "Amarelamento",
    categoria: "Amarelamento",
    localizacao: "Interior do tanque",
    descricao: "Amarelamento encontrado na inspecao expressa.",
    procedimentoRecomendado: "Avaliar necessidade de limpeza corretiva."
  }
];

function getTankTypeOptions(currentValue) {
  if (currentValue && !TANK_TYPES.includes(currentValue)) return [currentValue, ...TANK_TYPES];
  return TANK_TYPES;
}

function toInspectionStatus(selectedIssueIds) {
  return selectedIssueIds.length > 0 ? "COM_OBSERVACAO" : "APROVADO";
}

export default function InspecaoExpressaPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const inspectorName = authUser?.fullName?.trim() || authUser?.name || "";
  const [frotaEncontrada, setFrotaEncontrada] = useState(null);
  const [values, setValues] = useState({
    numeroFrota: "",
    placa: "",
    tipoEquipamento: "",
    dataInspecao: new Date().toISOString().slice(0, 16),
    tipoInspecao: "ANTES_LAVAGEM",
    observacoesGerais: ""
  });
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const status = useMemo(() => toInspectionStatus(selectedIssueIds), [selectedIssueIds]);
  const selectedIssues = useMemo(() => QUICK_ISSUES.filter((issue) => selectedIssueIds.includes(issue.id)), [selectedIssueIds]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const numero = values.numeroFrota.trim();
      if (!numero) {
        setFrotaEncontrada(null);
        return;
      }

      void (async () => {
        try {
          const response = await getFrotaByNumero(numero);
          setFrotaEncontrada(response.frota);
          if (response.frota) {
            setValues((current) => ({
              ...current,
              placa: response.frota?.placa ?? "",
              tipoEquipamento: response.frota?.tipoEquipamento ?? ""
            }));
          }
        } catch {
          setFrotaEncontrada(null);
        }
      })();
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [values.numeroFrota]);

  function updateValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleIssue(issueId) {
    setSelectedIssueIds((current) => (current.includes(issueId) ? current.filter((id) => id !== issueId) : [...current, issueId]));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!values.numeroFrota.trim() || !values.placa.trim() || !values.tipoEquipamento.trim()) {
        throw new Error("Informe frota, placa e tipo de tanque para salvar.");
      }

      const response = await createInspecao({
        frotaId: frotaEncontrada?.id ?? values.numeroFrota,
        numeroFrota: values.numeroFrota,
        placa: values.placa,
        tipoEquipamento: values.tipoEquipamento,
        dataInspecao: new Date(values.dataInspecao).toISOString(),
        tipoInspecao: values.tipoInspecao,
        status,
        observacoesGerais: values.observacoesGerais.trim() || "Registro criado pela inspecao expressa.",
        nomeInspetor: inspectorName,
        pontosCriticos: selectedIssues.map((issue) => ({
          categoria: issue.categoria,
          localizacao: issue.localizacao,
          descricao: issue.descricao,
          severidade: "LEVE",
          procedimentoRecomendado: issue.procedimentoRecomendado
        }))
      });

      navigate(`/inspecao/${response.inspecao.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar inspecao expressa");
    } finally {
      setSaving(false);
    }
  }

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame express-page",
      children: [
        _jsx(AppHeader, { title: "Inspecao expressa", subtitle: "Registro rapido para liberar ou apontar ocorrencias comuns.", showBack: true }),
        error ? _jsx("p", { className: "notice notice--error", children: error }) : null,
        _jsxs("form", {
          className: "express-shell",
          onSubmit: handleSubmit,
          children: [
            _jsxs(Card, {
              className: "section-card express-card",
              children: [
                _jsx("div", {
                  className: "section-head",
                  children: _jsxs("div", {
                    children: [_jsx("p", { className: "card-label", children: "Entrada rapida" }), _jsx("h2", { className: "section-title", children: "Dados da frota" })]
                  })
                }),
                _jsxs("div", {
                  className: "form-grid form-grid--three",
                  children: [
                    _jsx(Input, { label: "Frota", value: values.numeroFrota, onChange: (event) => updateValue("numeroFrota", event.target.value), placeholder: "Ex.: 1234-2" }),
                    _jsx(Input, { label: "Placa", value: values.placa, onChange: (event) => updateValue("placa", event.target.value), placeholder: "ABC-1234" }),
                    _jsxs("label", {
                      className: "input-field",
                      children: [
                        _jsx("span", { className: "input-field__label", children: "Tipo de tanque" }),
                        _jsxs("select", {
                          className: "input",
                          value: values.tipoEquipamento,
                          onChange: (event) => updateValue("tipoEquipamento", event.target.value),
                          children: [_jsx("option", { value: "", children: "Selecione" }), getTankTypeOptions(values.tipoEquipamento).map((type) => _jsx("option", { value: type, children: type }, type))]
                        })
                      ]
                    })
                  ]
                }),
                frotaEncontrada ? _jsx("p", { className: "notice notice--success", children: "Frota localizada e preenchida." }) : null
              ]
            }),
            _jsxs("div", {
              className: "express-grid",
              children: [
                _jsxs(Card, {
                  className: "section-card express-card",
                  children: [
                    _jsx("div", {
                      className: "section-head",
                      children: _jsxs("div", {
                        children: [_jsx("p", { className: "card-label", children: "Resultado" }), _jsx("h2", { className: "section-title", children: status === "APROVADO" ? "Sem apontamento" : "Com apontamento" })]
                      })
                    }),
                    _jsxs("div", {
                      className: "express-status",
                      children: [
                        _jsx("span", { className: `status ${status === "APROVADO" ? "status--success" : "status--danger"}`, children: status === "APROVADO" ? "APROVADO" : "COM OBSERVACAO" }),
                        _jsx("p", { className: "helper", children: selectedIssueIds.length > 0 ? `${selectedIssueIds.length} ocorrencia(s) marcada(s).` : "Nenhuma ocorrencia marcada." })
                      ]
                    }),
                    _jsxs("div", {
                      className: "form-grid form-grid--two",
                      children: [
                        _jsxs("label", {
                          className: "input-field",
                          children: [
                            _jsx("span", { className: "input-field__label", children: "Tipo da inspecao" }),
                            _jsxs("select", {
                              className: "input",
                              value: values.tipoInspecao,
                              onChange: (event) => updateValue("tipoInspecao", event.target.value),
                              children: [_jsx("option", { value: "ANTES_LAVAGEM", children: "Antes da lavagem" }), _jsx("option", { value: "APOS_LAVAGEM", children: "Apos lavagem" })]
                            })
                          ]
                        }),
                        _jsx(Input, { label: "Data", type: "datetime-local", value: values.dataInspecao, onChange: (event) => updateValue("dataInspecao", event.target.value) })
                      ]
                    }),
                    _jsx(Textarea, { label: "Observacoes", value: values.observacoesGerais, onChange: (event) => updateValue("observacoesGerais", event.target.value), placeholder: "Opcional" })
                  ]
                }),
                _jsxs(Card, {
                  className: "section-card express-card",
                  children: [
                    _jsx("div", {
                      className: "section-head",
                      children: _jsxs("div", {
                        children: [_jsx("p", { className: "card-label", children: "Toque rapido" }), _jsx("h2", { className: "section-title", children: "Ocorrencias comuns" })]
                      })
                    }),
                    _jsx("div", {
                      className: "express-issue-grid",
                      children: QUICK_ISSUES.map((issue) =>
                        _jsxs(
                          "button",
                          {
                            className: `express-issue ${selectedIssueIds.includes(issue.id) ? "express-issue--active" : ""}`,
                            type: "button",
                            onClick: () => toggleIssue(issue.id),
                            children: [_jsx("strong", { children: issue.label }), _jsx("span", { children: issue.localizacao })]
                          },
                          issue.id
                        )
                      )
                    })
                  ]
                })
              ]
            }),
            _jsxs("div", {
              className: "express-actions",
              children: [
                _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate("/nova-inspecao"), children: "Abrir completa" }),
                _jsx(Button, { type: "submit", disabled: saving, children: saving ? "Salvando..." : "Salvar expressa" })
              ]
            })
          ]
        })
      ]
    })
  });
}
