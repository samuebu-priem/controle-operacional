const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
function normalizeText(value, fallback) {
    const text = value?.trim();
    return text ? text : fallback;
}
function formatLabel(value, fallback) {
    return normalizeText(value, fallback);
}
function buildFileUrl(imageUrl) {
    try {
        return new URL(imageUrl, API_BASE).toString();
    }
    catch {
        return imageUrl;
    }
}
function getUniqueFotos(inspecao) {
    const fotos = new Map();
    for (const foto of inspecao.fotos ?? []) {
        fotos.set(foto.id, foto);
    }
    for (const ponto of inspecao.pontosCriticos) {
        for (const foto of ponto.fotos ?? []) {
            fotos.set(foto.id, foto);
        }
    }
    return Array.from(fotos.values());
}
function getSafeFileName(fileName, fallback) {
    const cleanName = fileName.trim().replace(/[\\/:*?"<>|]+/g, "_");
    return cleanName || fallback;
}
async function buildShareFiles(inspecao) {
    const fotos = getUniqueFotos(inspecao);
    const files = [];
    for (const [index, foto] of fotos.entries()) {
        try {
            const response = await fetch(buildFileUrl(foto.imageUrl));
            if (!response.ok)
                continue;
            const blob = await response.blob();
            const fileName = getSafeFileName(foto.fileName, `foto-${index + 1}.jpg`);
            files.push(new File([blob], fileName, { type: blob.type || "image/jpeg" }));
        }
        catch {
        }
    }
    return files;
}
async function copyTextToClipboard(text) {
    if (!navigator.clipboard?.writeText)
        return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch {
        return false;
    }
}
export function buildWhatsAppInspectionMessage(inspecao) {
    const observacao = normalizeText(inspecao.observacoesGerais, "Sem observacoes.");
    const inspetor = normalizeText(inspecao.nomeInspetor, "Nao informado");
    const header = [
        `*Frota:* ${inspecao.frota?.numeroFrota ?? inspecao.frotaId}`,
        `*Placa:* ${inspecao.frota?.placa ?? "Nao informada"}`,
        `*Inspetor:* ${inspetor}`,
        `*Observacao:* ${observacao}`
    ];
    const pontos =
        inspecao.pontosCriticos.length > 0
            ? inspecao.pontosCriticos
                .map((ponto, index) => {
                const prefix = inspecao.pontosCriticos.length > 1 ? `*Ponto critico ${index + 1}:*\n` : "*Ponto critico:*\n";
                return (`${prefix}` +
                    `*Tipo:* ${formatLabel(ponto.categoria, "Nao informado")}\n` +
                    `*Localizacao interna:* ${formatLabel(ponto.localizacao, "Nao informada")}\n` +
                    `*Descricao:* ${formatLabel(ponto.descricao, "Nao informada")}\n` +
                    `*Procedimento necessario:* ${formatLabel(ponto.procedimentoRecomendado, "Nao informado")}`);
            })
                .join("\n\n")
            : "*Ponto critico:*\nNenhum ponto critico registrado.";
    return [...header, "", pontos].join("\n");
}
export async function openWhatsAppInspectionMessage(inspecao) {
    const message = buildWhatsAppInspectionMessage(inspecao);
    const files = await buildShareFiles(inspecao);
    const shareNavigator = navigator;
    if (files.length > 0 && navigator.share) {
        const copied = await copyTextToClipboard(message);
        if (copied) {
            window.alert("O texto da inspeção foi copiado. Depois de escolher o WhatsApp, cole o texto na mensagem junto com as fotos.");
        }
        const shareData = {
            title: "Inspecao de frota",
            text: message,
            files
        };
        if (!shareNavigator.canShare || shareNavigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
        }
    }
    if (files.length > 0) {
        window.alert("Este navegador nao permite compartilhar arquivos automaticamente. Vou abrir o WhatsApp apenas com o texto.");
    }
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
}
