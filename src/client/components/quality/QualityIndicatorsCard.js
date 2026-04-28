import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
const PERIOD_LABELS = {
    THIS_MONTH: "Este mês",
    LAST_30_DAYS: "Últimos 30 dias",
    LAST_90_DAYS: "Últimos 90 dias",
    CUSTOM: "Personalizado"
};
const PALETTE = ["#22c55e", "#38bdf8", "#a78bfa", "#f59e0b", "#ef4444"];
function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}
function endOfDay(date) {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
}
function getPeriodRange(option, customStart, customEnd) {
    const now = new Date();
    if (option === "CUSTOM") {
        if (!customStart || !customEnd)
            return null;
        return {
            from: startOfDay(new Date(customStart)),
            to: endOfDay(new Date(customEnd))
        };
    }
    if (option === "LAST_30_DAYS") {
        const from = new Date(now);
        from.setDate(from.getDate() - 30);
        return { from: startOfDay(from), to: endOfDay(now) };
    }
    if (option === "LAST_90_DAYS") {
        const from = new Date(now);
        from.setDate(from.getDate() - 90);
        return { from: startOfDay(from), to: endOfDay(now) };
    }
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(from), to: endOfDay(now) };
}
function normalizeLabel(value) {
    return value.trim();
}
function buildTopIssues(inspecoes) {
    const frequency = new Map();
    inspecoes.forEach((inspecao) => {
        inspecao.pontosCriticos.forEach((ponto) => {
            const label = normalizeLabel(ponto.categoria);
            if (!label)
                return;
            frequency.set(label, (frequency.get(label) ?? 0) + 1);
        });
    });
    const sorted = [...frequency.entries()].sort((a, b) => b[1] - a[1]);
    const topFive = sorted.slice(0, 5);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);
    const others = total - topFive.reduce((sum, [, count]) => sum + count, 0);
    const items = topFive.map(([label, count], index) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: PALETTE[index % PALETTE.length]
    }));
    if (others > 0) {
        items.push({
            label: "Outros",
            count: others,
            percentage: total > 0 ? (others / total) * 100 : 0,
            color: "#64748b"
        });
    }
    return { items, total };
}
function filterByPeriod(inspecoes, option, customStart, customEnd) {
    const range = getPeriodRange(option, customStart, customEnd);
    if (!range)
        return [];
    return inspecoes.filter((inspecao) => {
        const date = new Date(inspecao.dataInspecao);
        return date >= range.from && date <= range.to;
    });
}
function DonutChart({ items }) {
    const size = 220;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;
    return (_jsxs("div", { className: "quality-donut", children: [_jsxs("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, role: "img", "aria-label": "Gr\u00E1fico de recorr\u00EAncias", children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "rgba(148, 163, 184, 0.12)", strokeWidth: strokeWidth }), items.map((item) => {
                        const dash = (item.count / items.reduce((sum, current) => sum + current.count, 0)) * circumference;
                        const offset = circumference - cumulative;
                        cumulative += dash;
                        return (_jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: item.color, strokeWidth: strokeWidth, strokeDasharray: `${dash} ${circumference - dash}`, strokeDashoffset: offset, transform: `rotate(-90 ${size / 2} ${size / 2})`, strokeLinecap: "round" }, item.label));
                    })] }), _jsxs("div", { className: "quality-donut__center", children: [_jsx("strong", { children: items.reduce((sum, current) => sum + current.count, 0) }), _jsx("span", { children: "ocorr\u00EAncias" })] })] }));
}
export default function QualityIndicatorsCard({ inspecoes }) {
    const [period, setPeriod] = useState("THIS_MONTH");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [appliedPeriod, setAppliedPeriod] = useState("THIS_MONTH");
    const [appliedCustomStart, setAppliedCustomStart] = useState("");
    const [appliedCustomEnd, setAppliedCustomEnd] = useState("");
    const filteredInspecoes = useMemo(() => {
        return filterByPeriod(inspecoes, appliedPeriod, appliedCustomStart, appliedCustomEnd);
    }, [inspecoes, appliedPeriod, appliedCustomStart, appliedCustomEnd]);
    const totalInspecoes = filteredInspecoes.length;
    const withCriticalPoints = filteredInspecoes.filter((inspecao) => inspecao.pontosCriticos.length > 0).length;
    const topIssues = useMemo(() => buildTopIssues(filteredInspecoes), [filteredInspecoes]);
    const leadingIssue = topIssues.items[0]?.label ?? "—";
    const canApplyCustom = period !== "CUSTOM" || (customStart.length > 0 && customEnd.length > 0);
    function handleApply() {
        if (!canApplyCustom)
            return;
        setAppliedPeriod(period);
        setAppliedCustomStart(customStart);
        setAppliedCustomEnd(customEnd);
    }
    return (_jsxs("section", { className: "quality-section", children: [_jsx("div", { className: "section-head quality-section__head", children: _jsxs("div", { children: [_jsx("p", { className: "card-label", children: "Indicadores de Qualidade" }), _jsx("h2", { className: "section-title", children: "Recorr\u00EAncias encontradas nas inspe\u00E7\u00F5es" })] }) }), _jsxs(Card, { className: "quality-card card--elevated", children: [_jsxs("div", { className: "quality-toolbar", children: [_jsxs("label", { className: "input-field quality-select", children: [_jsx("span", { className: "input-field__label", children: "Per\u00EDodo" }), _jsxs("select", { className: "select", value: period, onChange: (event) => setPeriod(event.target.value), children: [_jsx("option", { value: "THIS_MONTH", children: PERIOD_LABELS.THIS_MONTH }), _jsx("option", { value: "LAST_30_DAYS", children: PERIOD_LABELS.LAST_30_DAYS }), _jsx("option", { value: "LAST_90_DAYS", children: PERIOD_LABELS.LAST_90_DAYS }), _jsx("option", { value: "CUSTOM", children: PERIOD_LABELS.CUSTOM })] })] }), period === "CUSTOM" ? (_jsxs("div", { className: "quality-custom-dates", children: [_jsxs("label", { className: "input-field", children: [_jsx("span", { className: "input-field__label", children: "Data inicial" }), _jsx("input", { className: "input", type: "date", value: customStart, onChange: (event) => setCustomStart(event.target.value) })] }), _jsxs("label", { className: "input-field", children: [_jsx("span", { className: "input-field__label", children: "Data final" }), _jsx("input", { className: "input", type: "date", value: customEnd, onChange: (event) => setCustomEnd(event.target.value) })] })] })) : null, _jsx(Button, { type: "button", onClick: handleApply, children: "Aplicar" })] }), _jsxs("div", { className: "quality-kpis", children: [_jsxs("article", { className: "quality-kpi", children: [_jsx("span", { children: "Total inspe\u00E7\u00F5es" }), _jsx("strong", { children: totalInspecoes })] }), _jsxs("article", { className: "quality-kpi", children: [_jsx("span", { children: "Com ponto cr\u00EDtico" }), _jsx("strong", { children: withCriticalPoints })] }), _jsxs("article", { className: "quality-kpi", children: [_jsx("span", { children: "Recorr\u00EAncia l\u00EDder" }), _jsx("strong", { children: leadingIssue })] })] }), _jsxs("div", { className: "quality-layout", children: [_jsxs("div", { className: "quality-chart-panel", children: [topIssues.items.length > 0 ? _jsx(DonutChart, { items: topIssues.items }) : _jsx("p", { className: "helper", children: "Sem ocorr\u00EAncias no per\u00EDodo." }), _jsx("div", { className: "quality-legend", children: topIssues.items.map((item) => (_jsxs("div", { className: "quality-legend__item", children: [_jsx("span", { className: "quality-legend__swatch", style: { backgroundColor: item.color } }), _jsx("span", { children: item.label }), _jsxs("strong", { children: [item.count, " \u2022 ", Math.round(item.percentage), "%"] })] }, item.label))) })] }), _jsxs("div", { className: "quality-ranking", children: [_jsx("h3", { className: "section-title", children: "Top recorr\u00EAncias" }), _jsx("div", { className: "quality-ranking__list", children: topIssues.items.map((item, index) => (_jsxs("div", { className: "quality-ranking__item", children: [_jsx("span", { className: "quality-ranking__position", children: index + 1 }), _jsxs("div", { children: [_jsx("strong", { children: item.label }), _jsxs("p", { className: "helper", children: [item.count, " ocorr\u00EAncias \u2022 ", Math.round(item.percentage), "%"] })] })] }, item.label))) })] })] })] })] }));
}
