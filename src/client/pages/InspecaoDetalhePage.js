import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { deleteFoto, deleteInspecao, getInspecaoById, updateInspecao, uploadFotos } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { openWhatsAppInspectionMessage } from "../utils/whatsapp";
function formatDate(value) {
    return new Date(value).toLocaleDateString("pt-BR");
}
function formatDateTime(value) {
    return new Date(value).toLocaleString("pt-BR");
}
function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
export default function InspecaoDetalhePage() {
    const { id = "" } = useParams();
    const [inspecao, setInspecao] = useState(null);
    const [editing, setEditing] = useState(false);
    const [observacoesGerais, setObservacoesGerais] = useState("");
    const [pontosCriticos, setPontosCriticos] = useState([]);
    const [fotosToRemove, setFotosToRemove] = useState([]);
    const [fotosNovas, setFotosNovas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    async function load() {
        setLoading(true);
        setError("");
        try {
            const response = await getInspecaoById(id);
            const current = response.inspecao;
            setInspecao(current);
            setObservacoesGerais(current.observacoesGerais ?? "");
            setPontosCriticos(current.pontosCriticos.map((ponto) => ({
                id: ponto.id,
                categoria: ponto.categoria,
                localizacao: ponto.localizacao,
                descricao: ponto.descricao,
                severidade: ponto.severidade,
                procedimentoRecomendado: ponto.procedimentoRecomendado
            })));
            setFotosToRemove([]);
            setFotosNovas([]);
            setEditing(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar inspeção");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void load();
    }, [id]);
    const visibleFotos = useMemo(() => {
        return inspecao?.fotos.filter((foto) => !fotosToRemove.includes(foto.id)) ?? [];
    }, [inspecao, fotosToRemove]);
    function toggleEdit() {
        setEditing((current) => !current);
        setError("");
    }
    function addPonto() {
        setPontosCriticos((current) => [
            ...current,
            {
                categoria: "",
                localizacao: "",
                descricao: "",
                severidade: "LEVE",
                procedimentoRecomendado: ""
            }
        ]);
    }
    function updatePonto(index, patch) {
        setPontosCriticos((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
    }
    function removePonto(index) {
        setPontosCriticos((current) => current.filter((_, itemIndex) => itemIndex !== index));
    }
    async function handleSave() {
        if (!inspecao)
            return;
        setSaving(true);
        setError("");
        try {
            const filtered = pontosCriticos.filter((ponto) => ponto.categoria.trim() ||
                ponto.localizacao.trim() ||
                ponto.descricao.trim() ||
                ponto.procedimentoRecomendado.trim());
            await updateInspecao(inspecao.id, {
                observacoesGerais,
                pontosCriticos: filtered,
                fotosToRemove
            });
            await Promise.all(fotosToRemove.map((fotoId) => deleteFoto(fotoId)));
            if (fotosNovas.length > 0) {
                const formData = new FormData();
                for (const file of fotosNovas) {
                    formData.append("files[]", file);
                }
                await uploadFotos(inspecao.id, formData);
            }
            const refreshed = await getInspecaoById(inspecao.id);
            setInspecao(refreshed.inspecao);
            setEditing(false);
            setFotosNovas([]);
            setFotosToRemove([]);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao salvar alterações");
        }
        finally {
            setSaving(false);
        }
    }
    async function handleDelete() {
        if (!inspecao)
            return;
        const confirmed = window.confirm(`Excluir inspeção ${formatDate(inspecao.dataInspecao)}?`);
        if (!confirmed)
            return;
        await deleteInspecao(inspecao.id);
        window.location.href = "/";
    }
    function exportReport() {
        if (!inspecao)
            return;
        const report = [
            `Frota: ${inspecao.frota?.numeroFrota ?? "N/D"}`,
            `Placa: ${inspecao.frota?.placa ?? "N/D"}`,
            `Data: ${formatDate(inspecao.dataInspecao)}`,
            `Hora: ${formatDateTime(inspecao.dataInspecao)}`,
            `Inspetor: ${inspecao.nomeInspetor}`,
            `Observações: ${inspecao.observacoesGerais ?? "Sem observações"}`,
            "",
            "Pontos críticos:",
            ...inspecao.pontosCriticos.map((ponto) => `- ${ponto.categoria} | ${ponto.localizacao} | ${ponto.descricao} | ${ponto.procedimentoRecomendado}`),
            "",
            inspecao.fotos.length > 0 ? "Evidências anexadas." : "Sem fotos anexadas."
        ].join("\n");
        downloadTextFile(`inspecao-${inspecao.id}.txt`, report);
    }
    if (loading) {
        return (_jsx(AppLayout, { children: _jsxs("div", { className: "page-frame", children: [_jsx(AppHeader, { title: "Detalhes da inspe\u00E7\u00E3o", subtitle: "Informa\u00E7\u00F5es e evid\u00EAncias.", showBack: true }), _jsx(Card, { className: "section-card", children: _jsx("p", { className: "helper", children: "Carregando..." }) })] }) }));
    }
    if (!inspecao) {
        return (_jsx(AppLayout, { children: _jsxs("div", { className: "page-frame", children: [_jsx(AppHeader, { title: "Detalhes da inspe\u00E7\u00E3o", subtitle: "Informa\u00E7\u00F5es e evid\u00EAncias.", showBack: true }), _jsx(Card, { className: "section-card", children: _jsx("p", { className: "helper", children: error || "Inspeção não encontrada." }) })] }) }));
    }
    return (_jsx(AppLayout, { children: _jsxs("div", { className: "page-frame", children: [_jsx(AppHeader, { title: "Detalhes da inspe\u00E7\u00E3o", subtitle: "Informa\u00E7\u00F5es e evid\u00EAncias.", showBack: true }), _jsxs(Card, { className: "section-card card--elevated", children: [_jsxs("div", { className: "section-head", children: [_jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Resumo" }), _jsx("h2", { className: "section-title", children: formatDate(inspecao.dataInspecao) })] }), _jsx("span", { className: `status ${inspecao.status === "REPROVADO" ? "status--danger" : "status--success"}`, children: inspecao.status })] }), _jsxs("div", { className: "detail-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: toggleEdit, children: editing ? "Cancelar edição" : "Editar inspeção" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => void openWhatsAppInspectionMessage(inspecao), children: "Enviar pelo WhatsApp" }), _jsx(Button, { type: "button", variant: "secondary", onClick: exportReport, children: "Exportar relat\u00F3rio" }), _jsx(Button, { type: "button", variant: "danger", onClick: () => void handleDelete(), children: "Excluir inspe\u00E7\u00E3o" })] }), !editing ? (_jsxs("div", { className: "summary-list", children: [_jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Inspetor:" }), " ", inspecao.nomeInspetor] }), _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Tipo:" }), " ", inspecao.tipoInspecao] }), _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Observa\u00E7\u00F5es:" }), " ", inspecao.observacoesGerais ?? "Sem observações"] })] })) : (_jsx("div", { className: "form-grid", children: _jsx(Input, { label: "Observa\u00E7\u00F5es gerais", value: observacoesGerais, onChange: (event) => setObservacoesGerais(event.target.value) }) }))] }), _jsxs(Card, { className: "section-card", children: [_jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Pontos cr\u00EDticos" }), _jsxs("h2", { className: "section-title", children: [pontosCriticos.length, " itens registrados"] })] }) }), _jsx("div", { className: "critical-list", children: pontosCriticos.map((ponto, index) => editing ? (_jsxs("article", { className: "critical-item", children: [_jsx(Input, { label: "Categoria", value: ponto.categoria, onChange: (event) => updatePonto(index, { categoria: event.target.value }) }), _jsx(Input, { label: "Localiza\u00E7\u00E3o", value: ponto.localizacao, onChange: (event) => updatePonto(index, { localizacao: event.target.value }) }), _jsx(Input, { label: "Descri\u00E7\u00E3o", value: ponto.descricao, onChange: (event) => updatePonto(index, { descricao: event.target.value }) }), _jsx(Input, { label: "Procedimento necess\u00E1rio", value: ponto.procedimentoRecomendado, onChange: (event) => updatePonto(index, { procedimentoRecomendado: event.target.value }) }), _jsx(Button, { type: "button", variant: "danger", onClick: () => removePonto(index), children: "Remover ponto cr\u00EDtico" })] }, ponto.id ?? index)) : (_jsxs("article", { className: "critical-item", children: [_jsx("strong", { children: ponto.categoria }), _jsx("p", { className: "helper", children: ponto.localizacao }), _jsx("p", { children: ponto.descricao }), _jsx("p", { className: "text-subtle", children: ponto.procedimentoRecomendado })] }, ponto.id ?? index))) }), editing ? (_jsxs("div", { className: "detail-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: addPonto, children: "Adicionar ponto cr\u00EDtico" }), _jsx(Button, { type: "button", onClick: () => void handleSave(), disabled: saving, children: saving ? "Salvando..." : "Salvar alterações" })] })) : null] }), _jsxs(Card, { className: "section-card", children: [_jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Fotos" }), _jsxs("h2", { className: "section-title", children: [visibleFotos.length, " anexos"] })] }) }), editing ? (_jsx("div", { className: "search-bar", children: _jsx("input", { className: "input", "aria-label": "Anexar novas fotos", type: "file", multiple: true, onChange: (event) => {
                                    const files = Array.from(event.target.files ?? []);
                                    setFotosNovas((current) => [...current, ...files]);
                                } }) })) : null, _jsx("div", { className: "photo-upload__grid", children: visibleFotos.map((foto) => (_jsxs("figure", { className: "photo-upload__item", children: [_jsx("img", { src: foto.imageUrl, alt: foto.fileName }), _jsx("figcaption", { children: foto.fileName }), editing ? (_jsx(Button, { type: "button", variant: "danger", onClick: () => setFotosToRemove((current) => [...current, foto.id]), children: "Remover foto" })) : null] }, foto.id))) }), editing ? (_jsxs("div", { className: "helper", children: ["Novas fotos selecionadas: ", fotosNovas.length] })) : null] }), error ? _jsx("p", { className: "notice notice--error", children: error }) : null] }) }));
}
