import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createInspecao, getFrotaByNumero, listCollaborators, searchFrotas, uploadFotos } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import CriticalPointForm from "../components/inspecao/CriticalPointForm";
import InspectionForm from "../components/inspecao/InspectionForm";
import Button from "../components/ui/Button";
import { getAuthUser } from "../utils/auth";

const CHECKLIST_BASE = [
  { id: "boca-visita", label: "Boca de visita e tampa", localizacao: "Boca de visita", categoria: "Mancha" },
  { id: "valvulas", label: "Valvulas e drenos", localizacao: "Valvulas e drenos", categoria: "Resquicio de produto" },
  { id: "interior", label: "Interior do tanque", localizacao: "Parte interna", categoria: "Resquicio de produto" },
  { id: "quebra-ondas", label: "Quebra ondas", localizacao: "Quebra ondas", categoria: "Ferrugem" },
  { id: "soldas", label: "Soldas", localizacao: "Soldas", categoria: "Ferrugem" },
  { id: "fundo", label: "Fundo e chapa", localizacao: "Fundo e chapa", categoria: "Mancha" },
  { id: "odor", label: "Odor ou residuo aparente", localizacao: "Geral", categoria: "Resquicio de produto" }
];

const CATEGORIAS = ["Ferrugem", "Mancha", "Amarelamento", "Odor", "Produto residual", "Valvula contaminada", "Outro", "Resquicio de produto", "Fuligem"];
const SEVERIDADES = ["LEVE", "MEDIA", "GRAVE"];

function createChecklistState() {
  return CHECKLIST_BASE.map((item) => ({
    ...item,
    status: "PENDENTE",
    severidade: "LEVE",
    descricao: "",
    procedimentoRecomendado: ""
  }));
}

function buildChecklistObservacao(checklist) {
  const attentionItems = checklist.filter((item) => item.status === "ATENCAO");
  const okItems = checklist.filter((item) => item.status === "OK");
  const pendingItems = checklist.filter((item) => item.status === "PENDENTE");
  if (attentionItems.length === 0) return `Checklist fixo: ${okItems.length} itens OK e ${pendingItems.length} pendentes, sem apontamento.`;
  return `Checklist fixo: ${okItems.length} itens OK, ${attentionItems.length} com atencao, ${pendingItems.length} pendentes. Atencao em: ${attentionItems.map((item) => item.label).join(", ")}.`;
}

function checklistToCriticalPoints(checklist) {
  return checklist
    .filter((item) => item.status === "ATENCAO")
    .map((item) => ({
      categoria: item.categoria,
      localizacao: item.localizacao,
      descricao: item.descricao.trim() || `Apontamento no checklist: ${item.label}.`,
      severidade: item.severidade,
      procedimentoRecomendado: item.procedimentoRecomendado.trim() || "Avaliar, limpar e reinspecionar antes da liberacao.",
      files: []
    }));
}

export default function NovaInspecaoPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const inspectorName = authUser?.fullName?.trim() || authUser?.name || "";
  const [frotaEncontrada, setFrotaEncontrada] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  const [tipoConfirmado, setTipoConfirmado] = useState(false);
  const [values, setValues] = useState({
    numeroFrota: "",
    placa: "",
    tipoEquipamento: "",
    dataInspecao: new Date().toISOString().slice(0, 16),
    tipoInspecao: "ANTES_LAVAGEM",
    status: "COM_OBSERVACAO",
    colaboradorId: "",
    resultadoPosLavagem: "",
    motivoNaoConformidade: "",
    nomeInspetor: inspectorName,
    observacoesGerais: ""
  });
  const [checklist, setChecklist] = useState(createChecklistState);
  const [pontosCriticos, setPontosCriticos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setValues((current) => ({ ...current, nomeInspetor: inspectorName }));
  }, [inspectorName]);

  useEffect(() => {
    async function loadColaboradores() {
      try {
        const response = await listCollaborators();
        setColaboradores(response.colaboradores.filter((item) => item.ativo));
      } catch {
        setColaboradores([]);
      }
    }

    void loadColaboradores();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const numero = values.numeroFrota.trim();
      if (!numero) {
        setFrotaEncontrada(null);
        setTipoConfirmado(false);
        return;
      }

      void (async () => {
        try {
          const response = await getFrotaByNumero(numero);
          let frota = response.frota;

          if (!frota) {
            const searchResponse = await searchFrotas(numero);
            // Só auto-completar se houver EXATAMENTE UMA frota que começa com o prefixo
            if (searchResponse.frotas.length === 1) {
              frota = searchResponse.frotas[0];
            }
            // Se matches > 1: deixa sem frota (frotaEncontrada fica null)
          }

          setFrotaEncontrada(frota);
          if (frota) {
            setValues((current) => ({
              ...current,
              numeroFrota: frota.numeroFrota,
              placa: frota.placa ?? "",
              tipoEquipamento: frota.tipoEquipamento ?? ""
            }));
          }
        } catch {
          setFrotaEncontrada(null);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [values.numeroFrota]);

  function handleChange(field, value) {
    setValues((current) => {
      if (field === "tipoInspecao" && value === "ANTES_LAVAGEM") {
        return {
          ...current,
          tipoInspecao: value,
          colaboradorId: "",
          resultadoPosLavagem: "",
          motivoNaoConformidade: ""
        };
      }

      if (field === "resultadoPosLavagem") {
        return {
          ...current,
          resultadoPosLavagem: value,
          motivoNaoConformidade: value === "REPROVADO" ? current.motivoNaoConformidade : ""
        };
      }

      return { ...current, [field]: value };
    });
  }

  function addPonto() {
    setPontosCriticos((current) => [
      ...current,
      {
        categoria: "",
        localizacao: "",
        descricao: "",
        severidade: "LEVE",
        procedimentoRecomendado: "",
        files: []
      }
    ]);
  }

  function updatePonto(index, field, value) {
    setPontosCriticos((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function removePonto(index) {
    setPontosCriticos((current) => current.filter((_, i) => i !== index));
  }

  function updatePontoFiles(index, files) {
    setPontosCriticos((current) => current.map((item, i) => (i === index ? { ...item, files } : item)));
  }

  function removePontoFile(index, fileIndex) {
    setPontosCriticos((current) =>
      current.map((item, i) => (i === index ? { ...item, files: item.files.filter((_, currentIndex) => currentIndex !== fileIndex) } : item))
    );
  }

  function updateChecklistItem(id, field, value) {
    setChecklist((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const checklistPontos = checklistToCriticalPoints(checklist);
      const pontosParaSalvar = [...checklistPontos, ...pontosCriticos];
      const isPosLavagem = values.tipoInspecao === "APOS_LAVAGEM";

      if (isPosLavagem && (!values.colaboradorId || !values.resultadoPosLavagem)) {
        throw new Error("Informe colaborador e resultado para inspeção pós-lavagem.");
      }

      if (isPosLavagem && values.resultadoPosLavagem === "REPROVADO" && !values.motivoNaoConformidade) {
        throw new Error("Informe o motivo da não conformidade para reprovação.");
      }

      const observacoesComChecklist = [values.observacoesGerais.trim(), buildChecklistObservacao(checklist)].filter(Boolean).join("\n\n");
      const response = await createInspecao({
        frotaId: frotaEncontrada?.id ?? values.numeroFrota,
        numeroFrota: values.numeroFrota,
        placa: values.placa,
        tipoEquipamento: values.tipoEquipamento,
        dataInspecao: new Date(values.dataInspecao).toISOString(),
        tipoInspecao: values.tipoInspecao,
        status: isPosLavagem && values.resultadoPosLavagem ? values.resultadoPosLavagem : values.status,
        colaboradorId: isPosLavagem ? values.colaboradorId : null,
        resultadoPosLavagem: isPosLavagem ? values.resultadoPosLavagem : null,
        motivoNaoConformidade: isPosLavagem && values.resultadoPosLavagem === "REPROVADO" ? values.motivoNaoConformidade : null,
        observacoesGerais: observacoesComChecklist || null,
        pontosCriticos: pontosParaSalvar.map(({ files: _files, ...ponto }) => ponto)
      });

      const inspectionId = response.inspecao.id;
      const pontosCriados = response.inspecao.pontosCriticos ?? [];
      const filesToUpload = pontosParaSalvar.flatMap((ponto, index) =>
        ponto.files.map((file) => ({
          file,
          pontoCriticoId: pontosCriados[index]?.id ?? ""
        }))
      );

      if (filesToUpload.length > 0) {
        const formData = new FormData();
        for (const item of filesToUpload) {
          formData.append("files[]", item.file);
          formData.append("pontoCriticoId", item.pontoCriticoId);
        }
        await uploadFotos(inspectionId, formData);
      }

      setSuccess("Inspecao salva com sucesso.");
      navigate(`/inspecao/${inspectionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar inspecao");
    } finally {
      setSaving(false);
    }
  }

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame",
      children: [
        _jsx(AppHeader, { title: "Nova inspecao", subtitle: "Crie a inspecao, inclua checklist, pontos criticos, fotos e videos.", showBack: true }),
        error ? _jsx("p", { className: "notice notice--error", children: error }) : null,
        success ? _jsx("p", { className: "notice notice--success", children: success }) : null,
        _jsx(InspectionForm, {
          values,
          onChange: handleChange,
          onConfirmType: () => setTipoConfirmado(Boolean(values.tipoEquipamento)),
          onSubmit: handleSubmit,
          loading: saving,
          isFrotaEncontrada: Boolean(frotaEncontrada),
          tipoConfirmado,
          colaboradores
        }),
        _jsxs("section", {
          className: "section-card",
          children: [
            _jsx("div", {
              className: "section-head",
              children: _jsxs("div", {
                children: [_jsx("p", { className: "card-label", children: "Checklist fixo" }), _jsx("h2", { className: "section-title", children: "Itens obrigatorios da inspecao" })]
              })
            }),
            _jsx("div", {
              className: "inspection-checklist",
              children: checklist.map((item) =>
                _jsxs(
                  "article",
                  {
                    className: `inspection-checklist__item ${item.status === "OK" ? "inspection-checklist__item--ok" : ""} ${item.status === "ATENCAO" ? "inspection-checklist__item--attention" : ""}`.trim(),
                    children: [
                      _jsxs("div", {
                        className: "inspection-checklist__top",
                        children: [
                          _jsxs("div", { children: [_jsx("strong", { children: item.label }), _jsx("p", { className: "helper", children: item.localizacao })] }),
                          _jsxs("div", {
                            className: "inspection-checklist__toggle",
                            children: [
                              _jsx(Button, { type: "button", variant: item.status === "OK" ? "secondary" : "ghost", onClick: () => updateChecklistItem(item.id, "status", "OK"), children: "OK" }),
                              _jsx(Button, { type: "button", variant: item.status === "ATENCAO" ? "danger" : "ghost", onClick: () => updateChecklistItem(item.id, "status", "ATENCAO"), children: "Atencao" })
                            ]
                          })
                        ]
                      }),
                      item.status === "ATENCAO"
                        ? _jsxs("div", {
                            className: "inspection-checklist__details",
                            children: [
                              _jsxs("label", {
                                className: "input-field",
                                children: [
                                  _jsx("span", { className: "input-field__label", children: "Categoria" }),
                                  _jsx("select", {
                                    className: "input",
                                    value: item.categoria,
                                    onChange: (event) => updateChecklistItem(item.id, "categoria", event.target.value),
                                    children: CATEGORIAS.map((categoria) => _jsx("option", { value: categoria, children: categoria }, categoria))
                                  })
                                ]
                              }),
                              _jsxs("label", {
                                className: "input-field",
                                children: [
                                  _jsx("span", { className: "input-field__label", children: "Severidade" }),
                                  _jsx("select", {
                                    className: "input",
                                    value: item.severidade,
                                    onChange: (event) => updateChecklistItem(item.id, "severidade", event.target.value),
                                    children: SEVERIDADES.map((severidade) => _jsx("option", { value: severidade, children: severidade }, severidade))
                                  })
                                ]
                              }),
                              _jsxs("label", {
                                className: "input-field",
                                children: [
                                  _jsx("span", { className: "input-field__label", children: "Descricao" }),
                                  _jsx("textarea", { className: "input input--textarea", value: item.descricao, onChange: (event) => updateChecklistItem(item.id, "descricao", event.target.value), placeholder: "Descreva o apontamento encontrado" })
                                ]
                              }),
                              _jsxs("label", {
                                className: "input-field",
                                children: [
                                  _jsx("span", { className: "input-field__label", children: "Procedimento recomendado" }),
                                  _jsx("textarea", { className: "input input--textarea", value: item.procedimentoRecomendado, onChange: (event) => updateChecklistItem(item.id, "procedimentoRecomendado", event.target.value), placeholder: "Procedimento necessario para liberar" })
                                ]
                              })
                            ]
                          })
                        : null
                    ]
                  },
                  item.id
                )
              )
            })
          ]
        }),
        _jsxs("section", {
          className: "section-card",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Pontos criticos" }), _jsx("h2", { className: "section-title", children: "Itens opcionais" })] }) }),
            _jsx(CriticalPointForm, {
              pontosCriticos,
              onAdd: addPonto,
              onUpdate: updatePonto,
              onRemove: removePonto,
              onChangeFiles: updatePontoFiles,
              onRemoveFile: removePontoFile
            })
          ]
        })
      ]
    })
  });
}
