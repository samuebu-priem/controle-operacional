import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteFrota, listFrotas, updateFrota } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
const tankTypes = [
    "Tanque inox",
    "Tanque carbono",
    "Carreta tanque",
    "Bitrem tanque",
    "Isotank",
    "Outro"
];
const emptyForm = {
    numeroFrota: "",
    placa: "",
    tipoEquipamento: ""
};
function normalizeNumber(value) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}
function compareFrotaNumbers(a, b) {
    return normalizeNumber(a).localeCompare(normalizeNumber(b), "pt-BR", {
        numeric: true,
        sensitivity: "base"
    });
}
function sortFrotas(frotas) {
    return [...frotas].sort((a, b) => compareFrotaNumbers(a.numeroFrota, b.numeroFrota));
}
function matchesQuery(frota, query) {
    const value = query.trim().toLowerCase();
    if (!value)
        return true;
    return [frota.numeroFrota, frota.placa, frota.tipoEquipamento].some((field) => field.toLowerCase().includes(value));
}
function getTankTypeOptions(currentValue) {
    if (currentValue && !tankTypes.includes(currentValue)) {
        return [currentValue, ...tankTypes];
    }
    return tankTypes;
}
export default function RegistroFrotasPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [frotas, setFrotas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingFrota, setEditingFrota] = useState(null);
    const [formValues, setFormValues] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deletingFrota, setDeletingFrota] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [success, setSuccess] = useState("");
    async function load() {
        setLoading(true);
        setError("");
        setSuccess("");
        try {
            const response = await listFrotas();
            setFrotas(sortFrotas(response.frotas));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar frotas");
            setFrotas([]);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void load();
    }, []);
    const filteredFrotas = useMemo(() => {
        return sortFrotas(frotas.filter((frota) => matchesQuery(frota, search)));
    }, [frotas, search]);
    function openCreateModal() {
        setEditingFrota(null);
        setFormValues(emptyForm);
        setFormOpen(true);
    }
    function openEditModal(frota) {
        setEditingFrota(frota);
        setFormValues({
            numeroFrota: frota.numeroFrota,
            placa: frota.placa,
            tipoEquipamento: frota.tipoEquipamento
        });
        setFormOpen(true);
    }
    function closeModal() {
        if (saving)
            return;
        setFormOpen(false);
        setEditingFrota(null);
        setFormValues(emptyForm);
    }
    function openDeleteModal(frota) {
        setDeletingFrota(frota);
    }
    function closeDeleteModal() {
        if (deleting)
            return;
        setDeletingFrota(null);
    }
    async function saveFrota() {
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            if (editingFrota) {
                const response = await updateFrota(editingFrota.id, formValues);
                setFrotas((current) => sortFrotas(current.map((item) => (item.id === editingFrota.id ? response.frota : item))));
            }
            else {
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/frotas`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        ...formValues,
                        material: formValues.tipoEquipamento,
                        capacidade: "Não informado",
                        observacoesFixas: null
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.message ?? "Falha ao criar frota");
                }
                const data = (await response.json());
                setFrotas((current) => sortFrotas([...current, data.frota]));
            }
            closeModal();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao salvar frota");
        }
        finally {
            setSaving(false);
        }
    }
    async function confirmDelete() {
        if (!deletingFrota)
            return;
        setDeleting(true);
        setError("");
        try {
            await deleteFrota(deletingFrota.id);
            setFrotas((current) => current.filter((item) => item.id !== deletingFrota.id));
            setDeletingFrota(null);
            setSuccess("Frota removida com sucesso");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao excluir frota");
        }
        finally {
            setDeleting(false);
        }
    }
    return (_jsxs(AppLayout, { children: [_jsxs("div", { className: "page-frame", children: [_jsx(AppHeader, { title: "Registro de Frotas", subtitle: "Cadastre e edite frotas dispon\u00EDveis para inspe\u00E7\u00E3o.", showBack: true }), _jsxs(Card, { className: "section-card search-card", children: [_jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Frotas" }), _jsx("h2", { className: "section-title", children: "Buscar e organizar cadastro" })] }) }), _jsxs("div", { className: "search-bar", children: [_jsx(Input, { label: "Buscar por frota, placa ou tipo", value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Ex.: 1234-2, ABC-1234, Tanque Inox" }), _jsxs("div", { className: "inline-actions", children: [_jsx(Button, { type: "button", onClick: openCreateModal, children: "Adicionar frota" }), _jsx(Button, { variant: "secondary", type: "button", onClick: () => void load(), children: "Atualizar" })] })] }), error ? _jsx("p", { className: "notice notice--error", children: error }) : null, loading ? _jsx("p", { className: "helper", children: "Carregando..." }) : null] }), _jsxs("section", { className: "page-stack", children: [_jsx("div", { className: "history-list", children: filteredFrotas.map((frota) => (_jsx("div", { children: _jsx(Card, { className: "frota-card", children: _jsxs("div", { children: [_jsx("div", { className: "frota-card__top", children: _jsxs("div", { children: [_jsx("p", { className: "frota-card__label", children: "Registro de frota" }), _jsx("h3", { className: "frota-card__title", children: frota.numeroFrota }), _jsx("p", { className: "frota-card__meta", children: frota.tipoEquipamento })] }) }), _jsxs("div", { children: [_jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Placa:" }), " ", frota.placa] }), _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Tipo:" }), " ", frota.tipoEquipamento] })] }), _jsxs("div", { className: "frota-card__actions", children: [_jsx(Button, { variant: "secondary", type: "button", onClick: () => navigate(`/frotas/${frota.id}/historico`), children: "Hist\u00F3rico de inspe\u00E7\u00E3o" }), _jsx(Button, { variant: "ghost", type: "button", onClick: () => openEditModal(frota), children: "Editar" }), _jsx(Button, { variant: "danger", type: "button", onClick: () => openDeleteModal(frota), children: "Excluir" })] })] }) }) }, frota.id))) }), !loading && filteredFrotas.length === 0 ? _jsx("p", { className: "helper", children: "Nenhuma frota encontrada." }) : null] })] }), success ? _jsx("p", { className: "notice notice--success", children: success }) : null, formOpen ? (_jsx("div", { className: "modal-overlay modal-overlay--center", role: "presentation", onClick: closeModal, children: _jsxs("div", { className: "modal modal--fleet-registration", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation(), children: [_jsx("h2", { className: "modal__title", children: editingFrota ? "Editar frota" : "Adicionar frota" }), _jsxs("div", { className: "modal__body", children: [_jsx(Input, { label: "Frota", value: formValues.numeroFrota, onChange: (event) => setFormValues((current) => ({ ...current, numeroFrota: event.target.value })) }), _jsx(Input, { label: "Placa", value: formValues.placa, onChange: (event) => setFormValues((current) => ({ ...current, placa: event.target.value })) }), _jsxs("label", { className: "input-field", children: [_jsx("span", { className: "input-field__label", children: "Tipo de tanque" }), _jsxs("select", { className: "input", value: formValues.tipoEquipamento, onChange: (event) => setFormValues((current) => ({ ...current, tipoEquipamento: event.target.value })), children: [_jsx("option", { value: "", children: "Selecione" }), getTankTypeOptions(formValues.tipoEquipamento).map((type) => (_jsx("option", { value: type, children: type }, type)))] })] })] }), _jsxs("div", { className: "modal__actions", children: [_jsx(Button, { variant: "ghost", type: "button", onClick: closeModal, children: "Cancelar" }), _jsx(Button, { type: "button", onClick: () => void saveFrota(), disabled: saving, children: saving ? "Salvando..." : "Salvar" })] })] }) })) : null, deletingFrota ? (_jsx("div", { className: "modal-overlay", role: "presentation", onClick: closeDeleteModal, children: _jsxs("div", { className: "modal", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation(), children: [_jsx("h2", { className: "modal__title", children: "Excluir frota" }), _jsxs("p", { className: "helper", children: ["Excluir frota ", _jsx("strong", { children: deletingFrota.numeroFrota }), "?"] }), _jsx("p", { className: "helper", children: "Se houver hist\u00F3rico vinculado, o sistema vai impedir a exclus\u00E3o." }), _jsxs("div", { className: "modal__actions", children: [_jsx(Button, { variant: "ghost", type: "button", onClick: closeDeleteModal, children: "Cancelar" }), _jsx(Button, { variant: "danger", type: "button", onClick: () => void confirmDelete(), disabled: deleting, children: deleting ? "Excluindo..." : "Excluir frota" })] })] }) })) : null] }));
}
