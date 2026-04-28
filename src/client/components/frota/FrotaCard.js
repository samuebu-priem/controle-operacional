import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from "../ui/Button";
import Card from "../ui/Card";
function formatDate(value) {
    return new Date(value).toLocaleDateString("pt-BR");
}
export default function FrotaCard({ frota, ultimaInspecao, onEdit, onHistory, onOpenLast }) {
    return (_jsxs(Card, { className: "frota-card", children: [_jsxs("div", { className: "frota-card__top", children: [_jsxs("div", { children: [_jsx("p", { className: "frota-card__label", children: "Frota em destaque" }), _jsx("h3", { className: "frota-card__title", children: frota.numeroFrota }), _jsx("p", { className: "frota-card__meta", children: frota.tipoEquipamento })] }), _jsx("span", { className: `status ${ultimaInspecao?.status === "REPROVADO" ? "status--danger" : "status--success"}`, children: ultimaInspecao ? ultimaInspecao.status : "SEM INSPEÇÃO" })] }), _jsxs("div", { children: [_jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "Placa:" }), " ", frota.placa] }), _jsxs("p", { className: "frota-card__line", children: [_jsx("strong", { children: "\u00DAltima inspe\u00E7\u00E3o:" }), " ", ultimaInspecao ? formatDate(ultimaInspecao.dataInspecao) : "—"] })] }), _jsxs("div", { className: "frota-card__actions", children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onHistory, children: "Ver hist\u00F3rico" }), _jsx(Button, { variant: "secondary", type: "button", onClick: onOpenLast, disabled: !ultimaInspecao, children: "Abrir \u00FAltima inspe\u00E7\u00E3o" }), _jsx(Button, { variant: "ghost", type: "button", onClick: onEdit, children: "Editar" })] })] }));
}
