import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { autocompleteProducts, createInspecao, getFrotaByNumero, listCollaborators, searchFrotas, uploadFotos } from "../api";
import AppLayout from "../components/layout/AppLayout";
import CriticalPointForm from "../components/inspecao/CriticalPointForm";
import Button from "../components/ui/Button";
import { getAuthUser, logout } from "../utils/auth";
const DRAFT_KEY = "nova-inspecao:draft:v2";
const STEPS = ["Dados iniciais", "Checklist", "Evid\xEAncias", "Revis\xE3o e envio"];
const PROCEDURES = { WASH_ONLY: "Lavagem sem vapor", STEAM_ONLY: "Somente vapor", WASH_AND_STEAM: "Lavagem + vapor", NO_WASH_REQUIRED: "N\xE3o necessita lavagem", NOT_DEFINED: "N\xE3o definido" };
const LEVELS = { LOW: "Baixo", MEDIUM: "M\xE9dio", HIGH: "Alto" };
const CHECKLIST_BASE = [
  ["boca-visita", "Boca de visita e tampa", "Boca de visita", "Mancha"],
  ["valvulas", "V\xE1lvulas e drenos", "V\xE1lvulas e drenos", "Resqu\xEDcio de produto"],
  ["interior", "Interior do tanque", "Parte interna", "Resqu\xEDcio de produto"],
  ["quebra-ondas", "Quebra-ondas", "Quebra-ondas", "Ferrugem"],
  ["soldas", "Soldas", "Soldas", "Ferrugem"],
  ["fundo", "Fundo e chapa", "Fundo e chapa", "Mancha"],
  ["odor", "Odor ou res\xEDduo aparente", "Geral", "Resqu\xEDcio de produto"]
];
const CATEGORIAS = ["Ferrugem", "Mancha", "Amarelamento", "Odor", "Produto residual", "V\xE1lvula contaminada", "Outro", "Resqu\xEDcio de produto", "Fuligem"];
const SEVERIDADES = ["LEVE", "MEDIA", "GRAVE"];
function initialChecklist() {
  return CHECKLIST_BASE.map(([id, label, localizacao, categoria]) => ({ id, label, localizacao, categoria, status: "PENDENTE", severidade: "LEVE", descricao: "", procedimentoRecomendado: "" }));
}
function initialValues(name) {
  return { numeroFrota: "", placa: "", tipoEquipamento: "", dataInspecao: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16), tipoInspecao: "ANTES_LAVAGEM", status: "COM_OBSERVACAO", colaboradorId: "", resultadoPosLavagem: "", motivoNaoConformidade: "", nomeInspetor: name, observacoesGerais: "" };
}
function loadDraft(name) {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return draft ? { values: { ...initialValues(name), ...draft.values, nomeInspetor: name }, checklist: draft.checklist || initialChecklist(), pontos: (draft.pontos || []).map((p) => ({ ...p, files: [] })), product: draft.product || null } : null;
  } catch {
    return null;
  }
}
function checklistPoints(items) {
  return items.filter((i) => i.status === "ATENCAO").map((i) => ({ categoria: i.categoria, localizacao: i.localizacao, descricao: i.descricao.trim() || `Apontamento no checklist: ${i.label}.`, severidade: i.severidade, procedimentoRecomendado: i.procedimentoRecomendado.trim() || "Avaliar, limpar e reinspecionar antes da libera\xE7\xE3o.", files: [] }));
}
function checklistNote(items) {
  const ok = items.filter((i) => i.status === "OK").length, attention = items.filter((i) => i.status === "ATENCAO");
  return attention.length ? `Checklist fixo: ${ok} itens OK, ${attention.length} com aten\xE7\xE3o. Aten\xE7\xE3o em: ${attention.map((i) => i.label).join(", ")}.` : `Checklist fixo: ${ok} itens OK, sem apontamento.`;
}
function NovaInspecaoPage() {
  const navigate = useNavigate(), authUser = getAuthUser(), inspectorName = authUser?.fullName?.trim() || authUser?.name || "";
  const restored = useMemo(() => loadDraft(inspectorName), []);
  const [step, setStep] = useState(0), [values, setValues] = useState(restored?.values || initialValues(inspectorName)), [checklist, setChecklist] = useState(restored?.checklist || initialChecklist()), [pontos, setPontos] = useState(restored?.pontos || []);
  const [selectedProduct, setSelectedProduct] = useState(restored?.product || null), [productQuery, setProductQuery] = useState(restored?.product?.name || ""), [productOptions, setProductOptions] = useState([]), [productLoading, setProductLoading] = useState(false), [productDetails, setProductDetails] = useState(false);
  const [frota, setFrota] = useState(null), [fleetState, setFleetState] = useState("idle"), [collaborators, setCollaborators] = useState([]), [menuOpen, setMenuOpen] = useState(false), [saving, setSaving] = useState(false), [notice, setNotice] = useState(restored ? "Rascunho recuperado." : ""), [error, setError] = useState("");
  useEffect(() => {
    listCollaborators().then((r) => setCollaborators(r.colaboradores.filter((c) => c.ativo))).catch(() => setCollaborators([]));
  }, []);
  useEffect(() => {
    if (productQuery.trim().length < 2 || selectedProduct?.name === productQuery) {
      setProductOptions([]);
      setProductLoading(false);
      return;
    }
    setProductLoading(true);
    const timer = setTimeout(() => autocompleteProducts(productQuery).then((r) => setProductOptions(r.products)).catch(() => setProductOptions([])).finally(() => setProductLoading(false)), 250);
    return () => clearTimeout(timer);
  }, [productQuery, selectedProduct]);
  useEffect(() => {
    const number = values.numeroFrota.trim();
    if (!number) {
      setFrota(null);
      setFleetState("idle");
      return;
    }
    setFleetState("loading");
    const timer = setTimeout(async () => {
      try {
        let found = (await getFrotaByNumero(number)).frota;
        if (!found) {
          const result = await searchFrotas(number);
          if (result.frotas.length === 1) found = result.frotas[0];
        }
        setFrota(found);
        setFleetState(found ? "found" : "missing");
        if (found) setValues((v) => ({ ...v, numeroFrota: found.numeroFrota, placa: found.placa || "", tipoEquipamento: found.tipoEquipamento || "" }));
      } catch {
        setFrota(null);
        setFleetState("offline");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [values.numeroFrota]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanPoints = pontos.map(({ files, ...p }) => p);
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, checklist, pontos: cleanPoints, product: selectedProduct, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }));
    }, 400);
    return () => clearTimeout(timer);
  }, [values, checklist, pontos, selectedProduct]);
  function change(field, value) {
    setValues((v) => {
      if (field === "placa") value = value.toUpperCase().replace(/\s+/g, "").slice(0, 7);
      if (field === "tipoInspecao" && value === "ANTES_LAVAGEM") return { ...v, tipoInspecao: value, colaboradorId: "", resultadoPosLavagem: "", motivoNaoConformidade: "" };
      if (field === "resultadoPosLavagem") return { ...v, resultadoPosLavagem: value, motivoNaoConformidade: value === "REPROVADO" ? v.motivoNaoConformidade : "" };
      return { ...v, [field]: value };
    });
  }
  function updateChecklist(id, field, value) {
    setChecklist((c) => c.map((i) => i.id === id ? { ...i, [field]: value } : i));
  }
  function validateData() {
    if (!selectedProduct) return "Selecione a \xFAltima carga.";
    if (!values.numeroFrota.trim()) return "Informe o n\xFAmero da frota.";
    if (!values.placa.trim()) return "Informe a placa.";
    if (!values.tipoEquipamento) return "Selecione o tipo de tanque.";
    if (!values.dataInspecao) return "Informe a data da inspe\xE7\xE3o.";
    return "";
  }
  function goNext() {
    const validation = step === 0 ? validateData() : "";
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, checklist, pontos: pontos.map(({ files, ...p }) => p), product: selectedProduct, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }));
    setNotice("Rascunho salvo neste dispositivo.");
    setTimeout(() => setNotice(""), 2500);
  }
  async function submit() {
    const validation = validateData();
    if (validation) {
      setError(validation);
      setStep(0);
      return;
    }
    if (values.tipoInspecao === "APOS_LAVAGEM" && (!values.colaboradorId || !values.resultadoPosLavagem)) {
      setError("Informe colaborador e resultado da p\xF3s-lavagem.");
      return;
    }
    if (values.resultadoPosLavagem === "REPROVADO" && !values.motivoNaoConformidade) {
      setError("Informe o motivo da n\xE3o conformidade.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const allPoints = [...checklistPoints(checklist), ...pontos], observations = [values.observacoesGerais.trim(), checklistNote(checklist)].filter(Boolean).join("\n\n"), isPost = values.tipoInspecao === "APOS_LAVAGEM";
      const response = await createInspecao({ productId: selectedProduct.id, frotaId: frota?.id ?? values.numeroFrota, numeroFrota: values.numeroFrota, placa: values.placa, tipoEquipamento: values.tipoEquipamento, dataInspecao: new Date(values.dataInspecao).toISOString(), tipoInspecao: values.tipoInspecao, status: isPost && values.resultadoPosLavagem ? values.resultadoPosLavagem : values.status, colaboradorId: isPost ? values.colaboradorId : null, resultadoPosLavagem: isPost ? values.resultadoPosLavagem : null, motivoNaoConformidade: isPost && values.resultadoPosLavagem === "REPROVADO" ? values.motivoNaoConformidade : null, observacoesGerais: observations || null, pontosCriticos: allPoints.map(({ files, ...point }) => point) });
      const created = response.inspecao.pontosCriticos || [], uploads = allPoints.flatMap((point, index) => (point.files || []).map((file) => ({ file, pontoCriticoId: created[index]?.id || "" })));
      if (uploads.length) {
        const form = new FormData();
        uploads.forEach((item) => {
          form.append("files[]", item.file);
          form.append("pontoCriticoId", item.pontoCriticoId);
        });
        await uploadFotos(response.inspecao.id, form);
      }
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/inspecao/${response.inspecao.id}`);
    } catch (e) {
      setError(e.message || "Falha ao salvar inspe\xE7\xE3o.");
    } finally {
      setSaving(false);
    }
  }
  function handleLogout() {
    if (window.confirm("Deseja sair do sistema?")) {
      logout();
      navigate("/login", { replace: true });
    }
  }
  const addPoint = () => setPontos((p) => [...p, { categoria: "", localizacao: "", descricao: "", severidade: "LEVE", procedimentoRecomendado: "", files: [] }]);
  return /* @__PURE__ */ jsx(AppLayout, { className: "inspection-flow-layout", children: /* @__PURE__ */ jsxs("div", { className: "inspection-flow", children: [
    /* @__PURE__ */ jsxs("header", { className: "inspection-flow__header", children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "icon-button", onClick: () => navigate(-1), "aria-label": "Voltar", children: "\u2190" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { children: "Nova inspe\xE7\xE3o" }),
        /* @__PURE__ */ jsxs("small", { children: [
          "Etapa ",
          step + 1,
          " de 4 \xB7 ",
          STEPS[step]
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "icon-button", onClick: () => setMenuOpen((v) => !v), "aria-label": "Mais op\xE7\xF5es", "aria-expanded": menuOpen, children: "\u22EE" }),
      menuOpen ? /* @__PURE__ */ jsxs("div", { className: "inspection-flow__menu", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => navigate("/perfil"), children: "Perfil" }),
        /* @__PURE__ */ jsx("button", { onClick: saveDraft, children: "Salvar rascunho" }),
        /* @__PURE__ */ jsx("button", { onClick: handleLogout, children: "Deslogar" })
      ] }) : null
    ] }),
    /* @__PURE__ */ jsx("nav", { className: "inspection-stepper", "aria-label": "Etapas da inspe\xE7\xE3o", children: STEPS.map((label, index) => /* @__PURE__ */ jsxs("button", { type: "button", className: index === step ? "is-current" : index < step ? "is-complete" : "", onClick: () => index < step && setStep(index), children: [
      /* @__PURE__ */ jsx("i", { children: index < step ? "\u2713" : index + 1 }),
      /* @__PURE__ */ jsx("span", { children: label })
    ] }, label)) }),
    notice ? /* @__PURE__ */ jsx("p", { className: "notice notice--success", role: "status", children: notice }) : null,
    error ? /* @__PURE__ */ jsx("p", { className: "notice notice--error", role: "alert", children: error }) : null,
    /* @__PURE__ */ jsxs("div", { className: "inspection-flow__layout", children: [
      /* @__PURE__ */ jsxs("main", { className: "inspection-stage", children: [
        step === 0 ? /* @__PURE__ */ jsxs("section", { "aria-labelledby": "step-data", children: [
          /* @__PURE__ */ jsxs("div", { className: "inspection-stage__title", children: [
            /* @__PURE__ */ jsx("span", { children: "1" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h1", { id: "step-data", children: "Dados iniciais" }),
              /* @__PURE__ */ jsx("p", { children: "Identifique a carga e a frota." })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "inspection-fields", children: [
            /* @__PURE__ */ jsxs("label", { className: "inspection-field inspection-field--wide", children: [
              /* @__PURE__ */ jsx("span", { children: "\xDAltima carga" }),
              /* @__PURE__ */ jsxs("div", { className: "inspection-autocomplete", children: [
                /* @__PURE__ */ jsx("input", { value: productQuery, onChange: (e) => {
                  setProductQuery(e.target.value);
                  if (e.target.value !== selectedProduct?.name) setSelectedProduct(null);
                }, placeholder: "Buscar produto ou ONU", autoComplete: "off", "aria-autocomplete": "list" }),
                productQuery ? /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
                  setProductQuery("");
                  setSelectedProduct(null);
                }, "aria-label": "Limpar produto", children: "\xD7" }) : null
              ] }),
              productLoading ? /* @__PURE__ */ jsx("small", { children: "Buscando produtos..." }) : null,
              productOptions.length ? /* @__PURE__ */ jsx("div", { className: "inspection-suggestions", role: "listbox", children: productOptions.map((product) => /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => {
                setSelectedProduct(product);
                setProductQuery(product.name);
                setProductOptions([]);
              }, children: [
                /* @__PURE__ */ jsx("strong", { children: product.name }),
                /* @__PURE__ */ jsxs("span", { children: [
                  product.unNumber ? `ONU ${product.unNumber} \xB7 ` : "",
                  product.family?.name || "Sem fam\xEDlia"
                ] })
              ] }, product.id)) }) : null
            ] }),
            selectedProduct ? /* @__PURE__ */ jsxs("div", { className: "compact-product inspection-field--wide", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("strong", { children: selectedProduct.name }),
                /* @__PURE__ */ jsxs("span", { children: [
                  PROCEDURES[selectedProduct.washingProcedure || "NOT_DEFINED"],
                  " \xB7 Risco ",
                  LEVELS[selectedProduct.riskLevel] || "n\xE3o informado",
                  " \xB7 Dificuldade ",
                  LEVELS[selectedProduct.washDifficulty] || "n\xE3o informada"
                ] })
              ] }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setProductDetails(true), children: "Ver detalhes" })
            ] }) : null,
            /* @__PURE__ */ jsxs("label", { className: "inspection-field", children: [
              /* @__PURE__ */ jsx("span", { children: "N\xFAmero da frota" }),
              /* @__PURE__ */ jsx("input", { inputMode: "numeric", value: values.numeroFrota, onChange: (e) => change("numeroFrota", e.target.value.replace(/\D/g, "")), placeholder: "Ex.: 5832" }),
              fleetState === "loading" ? /* @__PURE__ */ jsx("small", { children: "Buscando frota..." }) : null
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "inspection-field", children: [
              /* @__PURE__ */ jsx("span", { children: "Placa" }),
              /* @__PURE__ */ jsx("input", { value: values.placa, onChange: (e) => change("placa", e.target.value), placeholder: "ABC1D23", autoCapitalize: "characters" })
            ] }),
            fleetState === "found" ? /* @__PURE__ */ jsxs("div", { className: "fleet-summary inspection-field--wide", children: [
              /* @__PURE__ */ jsx("span", { children: "\u2713" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("strong", { children: [
                  "Frota ",
                  frota.numeroFrota
                ] }),
                /* @__PURE__ */ jsxs("small", { children: [
                  frota.placa,
                  " \xB7 ",
                  frota.tipoEquipamento
                ] })
              ] })
            ] }) : fleetState === "missing" ? /* @__PURE__ */ jsxs("div", { className: "fleet-summary fleet-summary--warning inspection-field--wide", children: [
              /* @__PURE__ */ jsx("span", { children: "!" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("strong", { children: "Frota n\xE3o encontrada" }),
                /* @__PURE__ */ jsx("small", { children: "Cadastre os dados manualmente abaixo." })
              ] })
            ] }) : fleetState === "offline" ? /* @__PURE__ */ jsx("p", { className: "inline-state inspection-field--wide", children: "Conex\xE3o inst\xE1vel. Voc\xEA pode continuar preenchendo." }) : null,
            /* @__PURE__ */ jsxs("label", { className: "inspection-field", children: [
              /* @__PURE__ */ jsx("span", { children: "Tipo de tanque" }),
              /* @__PURE__ */ jsxs("select", { value: values.tipoEquipamento, onChange: (e) => change("tipoEquipamento", e.target.value), children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Selecione" }),
                ["Tanque inox", "Tanque carbono", "Carreta tanque", "Bitrem tanque", "Isotank", "Outro"].map((v) => /* @__PURE__ */ jsx("option", { children: v }, v))
              ] }),
              values.tipoEquipamento ? /* @__PURE__ */ jsx("small", { children: "Tipo selecionado com sucesso." }) : null
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "inspection-field", children: [
              /* @__PURE__ */ jsx("span", { children: "Data da inspe\xE7\xE3o" }),
              /* @__PURE__ */ jsx("input", { type: "datetime-local", value: values.dataInspecao, onChange: (e) => change("dataInspecao", e.target.value) })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "inspection-field", children: [
              /* @__PURE__ */ jsx("span", { children: "Tipo da inspe\xE7\xE3o" }),
              /* @__PURE__ */ jsxs("select", { value: values.tipoInspecao, onChange: (e) => change("tipoInspecao", e.target.value), children: [
                /* @__PURE__ */ jsx("option", { value: "ANTES_LAVAGEM", children: "Pr\xE9-lavagem" }),
                /* @__PURE__ */ jsx("option", { value: "APOS_LAVAGEM", children: "P\xF3s-lavagem" })
              ] })
            ] }),
            values.tipoInspecao === "ANTES_LAVAGEM" ? /* @__PURE__ */ jsxs("label", { className: "inspection-field", children: [
              /* @__PURE__ */ jsx("span", { children: "Status inicial" }),
              /* @__PURE__ */ jsxs("select", { value: values.status, onChange: (e) => change("status", e.target.value), children: [
                /* @__PURE__ */ jsx("option", { value: "APROVADO", children: "Aprovado" }),
                /* @__PURE__ */ jsx("option", { value: "REPROVADO", children: "Reprovado" }),
                /* @__PURE__ */ jsx("option", { value: "COM_OBSERVACAO", children: "Com observa\xE7\xE3o" })
              ] })
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsxs("label", { className: "inspection-field", children: [
                /* @__PURE__ */ jsx("span", { children: "Lavador respons\xE1vel" }),
                /* @__PURE__ */ jsxs("select", { value: values.colaboradorId, onChange: (e) => change("colaboradorId", e.target.value), children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Selecione" }),
                  collaborators.map((c) => /* @__PURE__ */ jsx("option", { value: c.id, children: c.nome }, c.id))
                ] })
              ] }),
              /* @__PURE__ */ jsxs("label", { className: "inspection-field", children: [
                /* @__PURE__ */ jsx("span", { children: "Resultado" }),
                /* @__PURE__ */ jsxs("select", { value: values.resultadoPosLavagem, onChange: (e) => change("resultadoPosLavagem", e.target.value), children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Selecione" }),
                  /* @__PURE__ */ jsx("option", { children: "APROVADO" }),
                  /* @__PURE__ */ jsx("option", { children: "REPROVADO" })
                ] })
              ] }),
              values.resultadoPosLavagem === "REPROVADO" ? /* @__PURE__ */ jsxs("label", { className: "inspection-field inspection-field--wide", children: [
                /* @__PURE__ */ jsx("span", { children: "Motivo da n\xE3o conformidade" }),
                /* @__PURE__ */ jsxs("select", { value: values.motivoNaoConformidade, onChange: (e) => change("motivoNaoConformidade", e.target.value), children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Selecione" }),
                  ["FERRUGEM", "MANCHA", "AMARELAMENTO", "ODOR", "PRODUTO_RESIDUAL", "VALVULA_CONTAMINADA", "OUTRO"].map((v) => /* @__PURE__ */ jsx("option", { children: v }, v))
                ] })
              ] }) : null
            ] })
          ] })
        ] }) : null,
        step === 1 ? /* @__PURE__ */ jsxs("section", { "aria-labelledby": "step-checklist", children: [
          /* @__PURE__ */ jsxs("div", { className: "inspection-stage__title", children: [
            /* @__PURE__ */ jsx("span", { children: "2" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h1", { id: "step-checklist", children: "Checklist" }),
              /* @__PURE__ */ jsx("p", { children: "Marque cada ponto como OK ou aten\xE7\xE3o." })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "guided-checklist", children: checklist.map((item) => /* @__PURE__ */ jsxs("article", { className: `guided-checklist__item ${item.status.toLowerCase()}`, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("strong", { children: item.label }),
              /* @__PURE__ */ jsx("small", { children: item.localizacao })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "guided-checklist__actions", children: [
              /* @__PURE__ */ jsx("button", { type: "button", className: item.status === "OK" ? "active-ok" : "", onClick: () => updateChecklist(item.id, "status", "OK"), children: "\u2713 OK" }),
              /* @__PURE__ */ jsx("button", { type: "button", className: item.status === "ATENCAO" ? "active-warning" : "", onClick: () => updateChecklist(item.id, "status", "ATENCAO"), children: "! Aten\xE7\xE3o" })
            ] }),
            item.status === "ATENCAO" ? /* @__PURE__ */ jsxs("div", { className: "guided-checklist__details", children: [
              /* @__PURE__ */ jsxs("label", { children: [
                /* @__PURE__ */ jsx("span", { children: "Categoria" }),
                /* @__PURE__ */ jsx("select", { value: item.categoria, onChange: (e) => updateChecklist(item.id, "categoria", e.target.value), children: CATEGORIAS.map((v) => /* @__PURE__ */ jsx("option", { children: v }, v)) })
              ] }),
              /* @__PURE__ */ jsxs("label", { children: [
                /* @__PURE__ */ jsx("span", { children: "Severidade" }),
                /* @__PURE__ */ jsx("select", { value: item.severidade, onChange: (e) => updateChecklist(item.id, "severidade", e.target.value), children: SEVERIDADES.map((v) => /* @__PURE__ */ jsx("option", { children: v }, v)) })
              ] }),
              /* @__PURE__ */ jsxs("label", { children: [
                /* @__PURE__ */ jsx("span", { children: "Descri\xE7\xE3o" }),
                /* @__PURE__ */ jsx("textarea", { value: item.descricao, onChange: (e) => updateChecklist(item.id, "descricao", e.target.value) })
              ] }),
              /* @__PURE__ */ jsxs("label", { children: [
                /* @__PURE__ */ jsx("span", { children: "Procedimento recomendado" }),
                /* @__PURE__ */ jsx("textarea", { value: item.procedimentoRecomendado, onChange: (e) => updateChecklist(item.id, "procedimentoRecomendado", e.target.value) })
              ] })
            ] }) : null
          ] }, item.id)) })
        ] }) : null,
        step === 2 ? /* @__PURE__ */ jsxs("section", { "aria-labelledby": "step-evidence", children: [
          /* @__PURE__ */ jsxs("div", { className: "inspection-stage__title", children: [
            /* @__PURE__ */ jsx("span", { children: "3" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h1", { id: "step-evidence", children: "Evid\xEAncias" }),
              /* @__PURE__ */ jsx("p", { children: "Registre pontos adicionais, fotos e v\xEDdeos." })
            ] })
          ] }),
          /* @__PURE__ */ jsx(CriticalPointForm, { pontosCriticos: pontos, onAdd: addPoint, onUpdate: (index, field, value) => setPontos((p) => p.map((item, i) => i === index ? { ...item, [field]: value } : item)), onRemove: (index) => setPontos((p) => p.filter((_, i) => i !== index)), onChangeFiles: (index, files) => setPontos((p) => p.map((item, i) => i === index ? { ...item, files } : item)), onRemoveFile: (index, fileIndex) => setPontos((p) => p.map((item, i) => i === index ? { ...item, files: item.files.filter((_, fi) => fi !== fileIndex) } : item)) }),
          /* @__PURE__ */ jsxs("label", { className: "inspection-field review-notes", children: [
            /* @__PURE__ */ jsx("span", { children: "Observa\xE7\xF5es gerais" }),
            /* @__PURE__ */ jsx("textarea", { value: values.observacoesGerais, onChange: (e) => change("observacoesGerais", e.target.value), placeholder: "Informa\xE7\xF5es adicionais da inspe\xE7\xE3o" })
          ] })
        ] }) : null,
        step === 3 ? /* @__PURE__ */ jsxs("section", { "aria-labelledby": "step-review", children: [
          /* @__PURE__ */ jsxs("div", { className: "inspection-stage__title", children: [
            /* @__PURE__ */ jsx("span", { children: "4" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h1", { id: "step-review", children: "Revis\xE3o e envio" }),
              /* @__PURE__ */ jsx("p", { children: "Confira os dados antes de finalizar." })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "inspection-review", children: [
            /* @__PURE__ */ jsxs("article", { children: [
              /* @__PURE__ */ jsx("span", { children: "\xDAltima carga" }),
              /* @__PURE__ */ jsx("strong", { children: selectedProduct?.name || "N\xE3o informada" }),
              /* @__PURE__ */ jsx("small", { children: PROCEDURES[selectedProduct?.washingProcedure || "NOT_DEFINED"] }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setStep(0), children: "Editar" })
            ] }),
            /* @__PURE__ */ jsxs("article", { children: [
              /* @__PURE__ */ jsx("span", { children: "Frota" }),
              /* @__PURE__ */ jsx("strong", { children: values.numeroFrota || "N\xE3o informada" }),
              /* @__PURE__ */ jsxs("small", { children: [
                values.placa || "Sem placa",
                " \xB7 ",
                values.tipoEquipamento || "Sem tipo"
              ] }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setStep(0), children: "Editar" })
            ] }),
            /* @__PURE__ */ jsxs("article", { children: [
              /* @__PURE__ */ jsx("span", { children: "Checklist" }),
              /* @__PURE__ */ jsxs("strong", { children: [
                checklist.filter((i) => i.status === "OK").length,
                " OK \xB7 ",
                checklist.filter((i) => i.status === "ATENCAO").length,
                " aten\xE7\xE3o"
              ] }),
              /* @__PURE__ */ jsxs("small", { children: [
                checklist.filter((i) => i.status === "PENDENTE").length,
                " pendentes"
              ] }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setStep(1), children: "Editar" })
            ] }),
            /* @__PURE__ */ jsxs("article", { children: [
              /* @__PURE__ */ jsx("span", { children: "Evid\xEAncias" }),
              /* @__PURE__ */ jsxs("strong", { children: [
                pontos.reduce((n, p) => n + (p.files?.length || 0), 0),
                " arquivos"
              ] }),
              /* @__PURE__ */ jsxs("small", { children: [
                pontos.length,
                " pontos adicionais"
              ] }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setStep(2), children: "Editar" })
            ] })
          ] })
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs("aside", { className: "inspection-summary", children: [
        /* @__PURE__ */ jsx("h2", { children: "Resumo da inspe\xE7\xE3o" }),
        /* @__PURE__ */ jsxs("dl", { children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Produto" }),
            /* @__PURE__ */ jsx("dd", { children: selectedProduct?.name || "\u2014" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Frota" }),
            /* @__PURE__ */ jsx("dd", { children: values.numeroFrota || "\u2014" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Placa" }),
            /* @__PURE__ */ jsx("dd", { children: values.placa || "\u2014" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Tanque" }),
            /* @__PURE__ */ jsx("dd", { children: values.tipoEquipamento || "\u2014" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Etapa" }),
            /* @__PURE__ */ jsx("dd", { children: STEPS[step] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "inspection-stage-actions", children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "draft-action", onClick: step ? () => setStep((s) => s - 1) : saveDraft, children: step ? "Voltar" : "Salvar rascunho" }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "continue-action", disabled: saving, onClick: step === 3 ? submit : goNext, children: saving ? "Enviando..." : step === 3 ? "Finalizar inspe\xE7\xE3o" : "Continuar" })
    ] }),
    productDetails && selectedProduct ? /* @__PURE__ */ jsx("div", { className: "product-detail-overlay", role: "presentation", onMouseDown: (e) => e.target === e.currentTarget && setProductDetails(false), children: /* @__PURE__ */ jsxs("section", { className: "inspection-product-drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "product-drawer-title", children: [
      /* @__PURE__ */ jsxs("header", { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("small", { children: "Detalhes da carga" }),
          /* @__PURE__ */ jsx("h2", { id: "product-drawer-title", children: selectedProduct.name })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setProductDetails(false), "aria-label": "Fechar", children: "\xD7" })
      ] }),
      /* @__PURE__ */ jsxs("dl", { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "ONU" }),
          /* @__PURE__ */ jsx("dd", { children: selectedProduct.unNumber || "N\xE3o informado" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Fam\xEDlia" }),
          /* @__PURE__ */ jsx("dd", { children: selectedProduct.family?.name || "N\xE3o informada" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Procedimento" }),
          /* @__PURE__ */ jsx("dd", { children: PROCEDURES[selectedProduct.washingProcedure || "NOT_DEFINED"] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Dificuldade" }),
          /* @__PURE__ */ jsx("dd", { children: LEVELS[selectedProduct.washDifficulty] || "N\xE3o informada" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Risco" }),
          /* @__PURE__ */ jsx("dd", { children: LEVELS[selectedProduct.riskLevel] || "N\xE3o informado" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "wide", children: [
          /* @__PURE__ */ jsx("dt", { children: "Observa\xE7\xE3o operacional" }),
          /* @__PURE__ */ jsx("dd", { children: selectedProduct.washingProcedureNotes || "Sem observa\xE7\xE3o." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "wide", children: [
          /* @__PURE__ */ jsx("dt", { children: "Pontos cr\xEDticos" }),
          /* @__PURE__ */ jsx("dd", { children: selectedProduct.criticalPoints || "N\xE3o informados." })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { type: "button", onClick: () => navigate(`/produtos/${selectedProduct.id}`), children: "Abrir ficha completa" })
    ] }) }) : null
  ] }) });
}
export {
  NovaInspecaoPage as default
};
