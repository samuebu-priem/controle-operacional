import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPostWashInspection, listCollaborators } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input, { Textarea } from "../components/ui/Input";
import Select from "../components/ui/Select";
import { openPostWashWhatsAppMessage } from "../utils/whatsapp";

const motivos = [
  ["FERRUGEM", "Ferrugem"],
  ["MANCHA", "Mancha"],
  ["AMARELAMENTO", "Amarelamento"],
  ["ODOR", "Odor"],
  ["PRODUTO_RESIDUAL", "Produto residual"],
  ["VALVULA_CONTAMINADA", "Valvula contaminada"],
  ["OUTRO", "Outro"]
];

export default function NovaInspecaoPosLavagemPage() {
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState([]);
  const [form, setForm] = useState({
    frota: "",
    colaboradorId: "",
    inspetor: "",
    resultado: "APROVADO",
    motivo: "",
    observacao: "",
    foto: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await listCollaborators();
        setColaboradores(response.colaboradores.filter((item) => item.ativo));
      } catch {
        setColaboradores([]);
      }
    }
    void load();
  }, []);

  const isRejected = form.resultado === "REPROVADO";
  const canSave = useMemo(() => {
    return form.frota.trim() && form.colaboradorId && form.inspetor.trim() && (!isRejected || form.motivo);
  }, [form, isRejected]);

  function patch(value) {
    setForm((current) => ({ ...current, ...value }));
  }

  async function save() {
    if (!canSave) {
      setError("Preencha os campos obrigatorios. Reprovacoes exigem motivo.");
      return;
    }

    setSaving(true);
    setError("");
    setCreated(null);
    try {
      const payload = {
        ...form,
        motivo: isRejected ? form.motivo : "",
        observacao: form.observacao || null,
        foto: form.foto || null
      };
      const response = await createPostWashInspection(payload);
      setCreated(response.inspecao);
      setForm({
        frota: "",
        colaboradorId: "",
        inspetor: form.inspetor,
        resultado: "APROVADO",
        motivo: "",
        observacao: "",
        foto: ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar inspecao");
    } finally {
      setSaving(false);
    }
  }

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame",
      children: [
        _jsx(AppHeader, { title: "Inspecao pos-lavagem", subtitle: "Registro rapido de aprovacao e nao conformidades.", showBack: true }),
        _jsxs(Card, {
          className: "section-card card--elevated",
          children: [
            _jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Operacao" }), _jsx("h2", { className: "section-title", children: "Nova inspeção" })] }) }),
            _jsxs("div", {
              className: "form-grid form-grid--two",
              children: [
                _jsx(Input, { label: "Frota", value: form.frota, onChange: (event) => patch({ frota: event.target.value }), placeholder: "Ex.: 1234" }),
                _jsx(Input, { label: "Inspetor", value: form.inspetor, onChange: (event) => patch({ inspetor: event.target.value }), placeholder: "Nome do inspetor" }),
                _jsxs(Select, { label: "Colaborador responsavel", value: form.colaboradorId, onChange: (event) => patch({ colaboradorId: event.target.value }), children: [_jsx("option", { value: "", children: "Selecione" }), colaboradores.map((item) => _jsx("option", { value: item.id, children: item.nome }, item.id))] }),
                _jsxs(Select, { label: "Resultado", value: form.resultado, onChange: (event) => patch({ resultado: event.target.value, motivo: event.target.value === "APROVADO" ? "" : form.motivo }), children: [_jsx("option", { value: "APROVADO", children: "APROVADO" }), _jsx("option", { value: "REPROVADO", children: "REPROVADO" })] }),
                isRejected ? _jsxs(Select, { label: "Nao conformidade", value: form.motivo, onChange: (event) => patch({ motivo: event.target.value }), errorText: isRejected && !form.motivo ? "Obrigatorio para reprovacao" : "", children: [_jsx("option", { value: "", children: "Selecione" }), motivos.map(([value, label]) => _jsx("option", { value: value, children: label }, value))] }) : null,
                _jsx(Input, { label: "Foto", helperText: "Campo preparado para URL de evidencia futura.", value: form.foto, onChange: (event) => patch({ foto: event.target.value }), placeholder: "Opcional" })
              ]
            }),
            _jsx(Textarea, { label: "Observacao", value: form.observacao, onChange: (event) => patch({ observacao: event.target.value }), placeholder: "Opcional" }),
            _jsxs("div", { className: "inline-actions", children: [_jsx(Button, { type: "button", onClick: () => void save(), disabled: saving || !canSave, children: saving ? "Registrando..." : "Registrar inspeção" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate("/pos-lavagem/historico"), children: "Ver historico" })] }),
            error ? _jsx("p", { className: "notice notice--error", children: error }) : null
          ]
        }),
        created
          ? _jsxs(Card, {
              className: "section-card",
              children: [
                _jsx("h2", { className: "section-title", children: "Inspecao registrada" }),
                _jsxs("p", { className: "helper", children: ["Frota ", created.frota, " registrada como ", created.resultado, "."] }),
                _jsxs("div", { className: "inline-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => openPostWashWhatsAppMessage(created), children: "Compartilhar WhatsApp" }), _jsx(Button, { type: "button", onClick: () => navigate("/pos-lavagem/dashboard"), children: "Ver indicadores" })] })
              ]
            })
          : null
      ]
    })
  });
}
