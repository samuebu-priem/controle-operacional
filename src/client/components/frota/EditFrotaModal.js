import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { updateFrota } from "../../api";
import Button from "../ui/Button";
import Input from "../ui/Input";
export default function EditFrotaModal({ open, frota, onClose, onSaved }) {
    const [numeroFrota, setNumeroFrota] = useState("");
    const [placa, setPlaca] = useState("");
    const [tipoEquipamento, setTipoEquipamento] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        if (frota) {
            setNumeroFrota(frota.numeroFrota);
            setPlaca(frota.placa);
            setTipoEquipamento(frota.tipoEquipamento);
        }
    }, [frota]);
    async function handleSubmit(event) {
        if (!frota)
            return;
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const response = await updateFrota(frota.id, { numeroFrota, placa, tipoEquipamento });
            onSaved(response.frota);
            onClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao salvar frota");
        }
        finally {
            setSaving(false);
        }
    }
    if (!open || !frota)
        return null;
    return (_jsx("div", { className: "modal-overlay", role: "presentation", onClick: onClose, children: _jsxs("div", { className: "modal", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation(), children: [_jsx("h2", { className: "modal__title", children: "Editar frota" }), _jsxs("form", { className: "modal__body", onSubmit: handleSubmit, children: [_jsx(Input, { label: "Frota", value: numeroFrota, onChange: (e) => setNumeroFrota(e.target.value) }), _jsx(Input, { label: "Placa", value: placa, onChange: (e) => setPlaca(e.target.value) }), _jsx(Input, { label: "Tipo de tanque", value: tipoEquipamento, onChange: (e) => setTipoEquipamento(e.target.value) }), error ? _jsx("p", { className: "notice notice--error", children: error }) : null, _jsxs("div", { className: "modal__actions", children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", disabled: saving, children: "Salvar" })] })] })] }) }));
}
