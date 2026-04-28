import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteInspecao, getInspecaoById, listInspecoes } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { openWhatsAppInspectionMessage } from "../utils/whatsapp";
function formatDate(value) {
    return new Date(value).toLocaleDateString("pt-BR");
}
function formatTime(value) {
    return new Date(value).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}
function normalizeText(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}
function buildSearchText(inspecao) {
    return normalizeText([
        inspecao.frota?.numeroFrota ?? "",
        inspecao.frota?.placa ?? "",
        formatDate(inspecao.dataInspecao),
        formatTime(inspecao.dataInspecao)
    ].join(" "));
}
function hasCriticalPoint(inspecao) {
    return (inspecao.pontosCriticos ?? []).length > 0;
}
function hasPhotos(inspecao) {
    return (inspecao.pontosCriticos ?? []).some((ponto) => {
        const fotos = ponto.fotos ?? [];
        return fotos.length > 0;
    });
}
export default function HistoricoInspecoesPage() {
    const navigate = useNavigate();
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCritical, setShowCritical] = useState(false);
    const [showWithoutCritical, setShowWithoutCritical] = useState(false);
    const [showWithPhotos, setShowWithPhotos] = useState(false);
    const [inspecoes, setInspecoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    async function load() {
        setLoading(true);
        setError("");
        try {
            const response = await listInspecoes();
            setInspecoes(response.inspecoes);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar histórico");
            setInspecoes([]);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void load();
    }, []);
    const filteredInspecoes = useMemo(() => {
        const query = normalizeText(searchQuery);
        return inspecoes.filter((inspecao) => {
            const textMatches = !query || buildSearchText(inspecao).includes(query);
            const criticalMatches = !showCritical || hasCriticalPoint(inspecao);
            const withoutCriticalMatches = !showWithoutCritical || !hasCriticalPoint(inspecao);
            const photosMatches = !showWithPhotos || hasPhotos(inspecao);
            return textMatches && criticalMatches && withoutCriticalMatches && photosMatches;
        });
    }, [inspecoes, searchQuery, showCritical, showWithoutCritical, showWithPhotos]);
    async function handleDelete(id) {
        const confirmed = window.confirm("Excluir inspeção?");
        if (!confirmed)
            return;
        await deleteInspecao(id);
        setInspecoes((current) => current.filter((item) => item.id !== id));
    }
    async function handleOpenWhatsApp(id) {
        const response = await getInspecaoById(id);
        await openWhatsAppInspectionMessage(response.inspecao);
    }
    function handleConfirmSearch() {
        setSearchQuery(searchInput);
    }
    function handleClear() {
        setSearchInput("");
        setSearchQuery("");
        setShowCritical(false);
        setShowWithoutCritical(false);
        setShowWithPhotos(false);
    }
    return (_jsx(AppLayout, { children: _jsxs("div", { className: "page-frame history-page", children: [_jsx(AppHeader, { title: "Hist\u00F3rico de inspe\u00E7\u00F5es", subtitle: "Busque e abra inspe\u00E7\u00F5es salvas.", showBack: true }), _jsx("style", { children: `
          .history-page {
            display: flex;
            flex-direction: column;
            gap: 22px;
          }

          .history-search-panel {
            padding: 22px;
            border-radius: 20px;
            background: linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(13, 19, 32, 0.96));
            border: 1px solid rgba(148, 163, 184, 0.12);
            box-shadow: 0 18px 50px rgba(2, 6, 23, 0.42);
            gap: 18px;
          }

          .history-section-label {
            margin: 0 0 8px;
            color: #94a3b8;
            font-size: 0.77rem;
            font-weight: 700;
            letter-spacing: 0.09em;
            text-transform: uppercase;
          }

          .history-filter-title {
            margin: 0;
            color: #f8fafc;
            font-size: 1rem;
            font-weight: 650;
            line-height: 1.2;
          }

          .history-search-input .input-field__label {
            color: #64748b;
            font-size: 0.84rem;
            font-weight: 600;
          }

          .history-search-input .input {
            min-height: 52px;
            padding: 0 16px;
            border-radius: 16px;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
            border-color: rgba(148, 163, 184, 0.14);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
          }

          .history-search-input .input::placeholder {
            color: #64748b;
          }

          .history-search-input .input:focus {
            box-shadow:
              0 0 0 3px rgba(34, 197, 94, 0.12),
              0 0 0 1px rgba(34, 197, 94, 0.26);
          }

          .history-filter-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .history-filter-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 42px;
            padding: 0 14px;
            border-radius: 999px;
            border: 1px solid rgba(148, 163, 184, 0.16);
            background: rgba(15, 23, 42, 0.72);
            color: #cbd5e1;
            font-size: 0.92rem;
            font-weight: 600;
            cursor: pointer;
            user-select: none;
            transition:
              transform 140ms ease,
              border-color 140ms ease,
              background-color 140ms ease,
              color 140ms ease,
              box-shadow 140ms ease;
          }

          .history-filter-chip:hover {
            transform: translateY(-1px);
            border-color: rgba(148, 163, 184, 0.26);
            background: rgba(30, 41, 59, 0.92);
            color: #f8fafc;
          }

          .history-filter-chip input {
            accent-color: #22c55e;
            margin: 0;
          }

          .history-filter-chip:has(input:checked) {
            border-color: rgba(34, 197, 94, 0.34);
            background: rgba(34, 197, 94, 0.1);
            color: #dcfce7;
            box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.08);
          }

          .history-action-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .history-action-row .button {
            min-width: 150px;
          }

          .history-inspection-card {
            padding: 20px;
            border-radius: 18px;
            background: rgba(17, 24, 39, 0.9);
            border: 1px solid rgba(148, 163, 184, 0.12);
            box-shadow: 0 16px 40px rgba(2, 6, 23, 0.22);
            transition:
              transform 140ms ease,
              border-color 140ms ease,
              background-color 140ms ease,
              box-shadow 140ms ease;
          }

          .history-inspection-card:hover {
            transform: translateY(-2px);
            border-color: rgba(148, 163, 184, 0.2);
            background: rgba(17, 24, 39, 0.98);
            box-shadow: 0 20px 46px rgba(2, 6, 23, 0.3);
          }

          .history-inspection-card__meta {
            display: grid;
            gap: 6px;
          }

          .history-inspection-card__title {
            margin: 0;
            font-size: 1.03rem;
            font-weight: 700;
            line-height: 1.28;
            color: #f8fafc;
          }

          .history-inspection-card__subtitle {
            margin: 0;
            color: #94a3b8;
            font-size: 0.92rem;
            line-height: 1.45;
          }

          .history-inspection-card__date {
            margin: 0;
            color: #64748b;
            font-size: 0.92rem;
            line-height: 1.45;
          }

          .history-inspection-card__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: flex-end;
          }

          .history-list {
            gap: 18px;
          }

          @media (max-width: 768px) {
            .history-search-panel {
              padding: 18px;
              border-radius: 18px;
            }

            .history-action-row .button {
              width: 100%;
              min-width: 0;
            }

            .history-inspection-card__actions {
              justify-content: stretch;
            }

            .history-inspection-card__actions .button {
              width: 100%;
            }
          }
        ` }), _jsxs(Card, { className: "section-card search-card history-search-panel", children: [_jsxs("div", { children: [_jsx("p", { className: "history-section-label", children: "Busca r\u00E1pida" }), _jsx("h2", { className: "history-filter-title", children: "Busca r\u00E1pida" })] }), _jsx("div", { className: "search-bar", children: _jsx(Input, { className: "history-search-input", label: "Busque pela frota, placa ou data", value: searchInput, onChange: (event) => setSearchInput(event.target.value), placeholder: "Busque pela frota, placa ou data" }) }), _jsxs("div", { children: [_jsx("p", { className: "history-section-label", children: "Filtros" }), _jsxs("div", { className: "history-filter-chips", children: [_jsxs("label", { className: "history-filter-chip", children: [_jsx("input", { type: "checkbox", checked: showCritical, onChange: (event) => {
                                                        setShowCritical(event.target.checked);
                                                        if (event.target.checked)
                                                            setShowWithoutCritical(false);
                                                    } }), _jsx("span", { children: "Com ponto cr\u00EDtico" })] }), _jsxs("label", { className: "history-filter-chip", children: [_jsx("input", { type: "checkbox", checked: showWithoutCritical, onChange: (event) => {
                                                        setShowWithoutCritical(event.target.checked);
                                                        if (event.target.checked)
                                                            setShowCritical(false);
                                                    } }), _jsx("span", { children: "Sem ponto cr\u00EDtico" })] }), _jsxs("label", { className: "history-filter-chip", children: [_jsx("input", { type: "checkbox", checked: showWithPhotos, onChange: (event) => setShowWithPhotos(event.target.checked) }), _jsx("span", { children: "Com fotos" })] })] })] }), _jsxs("div", { className: "history-action-row", children: [_jsx(Button, { type: "button", onClick: handleConfirmSearch, children: "Confirmar busca" }), _jsx(Button, { type: "button", variant: "secondary", onClick: handleClear, children: "Limpar" })] }), error ? _jsx("p", { className: "notice notice--error", children: error }) : null, loading ? _jsx("p", { className: "helper", children: "Carregando..." }) : null] }), _jsxs("section", { className: "page-stack", children: [_jsx("div", { className: "history-list", children: filteredInspecoes.map((inspecao) => (_jsxs("article", { className: "history-item history-inspection-card", children: [_jsxs("div", { className: "history-item__top", children: [_jsxs("div", { className: "history-inspection-card__meta", children: [_jsxs("h3", { className: "history-inspection-card__title", children: ["Frota ", inspecao.frota?.numeroFrota ?? "Não informada"] }), _jsxs("p", { className: "history-inspection-card__subtitle", children: ["Placa: ", inspecao.frota?.placa ?? "Não informada"] }), _jsxs("p", { className: "history-inspection-card__date", children: [formatDate(inspecao.dataInspecao), " \u2022 ", formatTime(inspecao.dataInspecao)] })] }), _jsxs("span", { className: `status ${inspecao.status === "REPROVADO" ? "status--danger" : "status--success"}`, children: [inspecao.pontosCriticos.length, " pontos cr\u00EDticos"] })] }), _jsxs("div", { className: "history-inspection-card__actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate(`/inspecao/${inspecao.id}`), children: "Abrir inspe\u00E7\u00E3o" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => void handleDelete(inspecao.id), children: "Excluir inspe\u00E7\u00E3o" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => void handleOpenWhatsApp(inspecao.id), "aria-label": "Abrir no WhatsApp", children: _jsx("span", { "aria-hidden": "true", children: "\uD83D\uDFE2" }) })] })] }, inspecao.id))) }), !loading && filteredInspecoes.length === 0 ? _jsx("p", { className: "helper", children: "Nenhuma inspe\u00E7\u00E3o encontrada." }) : null] })] }) }));
}
