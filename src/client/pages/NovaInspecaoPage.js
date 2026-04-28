import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createInspecao, getFrotaByNumero, uploadFotos } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import CriticalPointForm from "../components/inspecao/CriticalPointForm";
import InspectionForm from "../components/inspecao/InspectionForm";
export default function NovaInspecaoPage() {
    const navigate = useNavigate();
    const [frotaEncontrada, setFrotaEncontrada] = useState(null);
    const [tipoConfirmado, setTipoConfirmado] = useState(false);
    const [values, setValues] = useState({
        numeroFrota: "",
        placa: "",
        tipoEquipamento: "",
        dataInspecao: new Date().toISOString().slice(0, 16),
        tipoInspecao: "ANTES_LAVAGEM",
        status: "COM_OBSERVACAO",
        nomeInspetor: "",
        observacoesGerais: ""
    });
    const [pontosCriticos, setPontosCriticos] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [savedInspectionId, setSavedInspectionId] = useState("");
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
                    setFrotaEncontrada(response.frota);
                    if (response.frota) {
                        setValues((current) => ({
                            ...current,
                            placa: response.frota?.placa ?? "",
                            tipoEquipamento: response.frota?.tipoEquipamento ?? ""
                        }));
                    }
                }
                catch {
                    setFrotaEncontrada(null);
                }
            })();
        }, 300);
        return () => window.clearTimeout(timeout);
    }, [values.numeroFrota]);
    const previewUrls = useMemo(() => [], []);
    function handleChange(field, value) {
        setValues((current) => ({ ...current, [field]: value }));
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
        setPontosCriticos((current) => current.map((item, i) => i === index ? { ...item, files: item.files.filter((_, currentIndex) => currentIndex !== fileIndex) } : item));
    }
    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            const response = await createInspecao({
                frotaId: frotaEncontrada?.id ?? values.numeroFrota,
                numeroFrota: values.numeroFrota,
                placa: values.placa,
                tipoEquipamento: values.tipoEquipamento,
                dataInspecao: new Date(values.dataInspecao).toISOString(),
                tipoInspecao: values.tipoInspecao,
                status: values.status,
                observacoesGerais: values.observacoesGerais || null,
                nomeInspetor: values.nomeInspetor,
                pontosCriticos: pontosCriticos.map(({ files: _files, ...ponto }) => ponto)
            });
            const inspectionId = response.inspecao.id;
            setSavedInspectionId(inspectionId);
            const pontosCriados = response.inspecao.pontosCriticos ?? [];
            const filesToUpload = pontosCriticos.flatMap((ponto, index) => ponto.files.map((file) => ({
                file,
                pontoCriticoId: pontosCriados[index]?.id ?? ""
            })));
            if (filesToUpload.length > 0) {
                const formData = new FormData();
                for (const item of filesToUpload) {
                    formData.append("files[]", item.file);
                    formData.append("pontoCriticoId", item.pontoCriticoId);
                }
                await uploadFotos(inspectionId, formData);
            }
            setSuccess("Inspeção salva com sucesso.");
            navigate(`/inspecao/${inspectionId}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao salvar inspeção");
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsx(AppLayout, { children: _jsxs("div", { className: "page-frame", children: [_jsx(AppHeader, { title: "Nova inspe\u00E7\u00E3o", subtitle: "Crie a inspe\u00E7\u00E3o, inclua pontos cr\u00EDticos e fotos.", showBack: true }), error ? _jsx("p", { className: "notice notice--error", children: error }) : null, success ? _jsx("p", { className: "notice notice--success", children: success }) : null, _jsx(InspectionForm, { values: values, onChange: handleChange, onConfirmType: () => setTipoConfirmado(Boolean(values.tipoEquipamento)), onSubmit: handleSubmit, loading: saving, isFrotaEncontrada: Boolean(frotaEncontrada), tipoConfirmado: tipoConfirmado }), _jsxs("section", { className: "section-card", children: [_jsx("div", { className: "section-head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Pontos cr\u00EDticos" }), _jsx("h2", { className: "section-title", children: "Itens opcionais" })] }) }), _jsx(CriticalPointForm, { pontosCriticos: pontosCriticos, onAdd: addPonto, onUpdate: updatePonto, onRemove: removePonto, onChangeFiles: updatePontoFiles, onRemoveFile: removePontoFile })] })] }) }));
}
