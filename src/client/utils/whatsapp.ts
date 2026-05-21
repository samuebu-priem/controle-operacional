import type { FotoInspecao, Inspecao, PontoCritico } from "../../shared/types";

type WhatsAppPontoCritico = PontoCritico & {
  fotos?: FotoInspecao[];
};

type WhatsAppInspection = Omit<Inspecao, "pontosCriticos"> & {
  frota?: {
    numeroFrota?: string | null;
    placa?: string | null;
  } | null;
  pontosCriticos: WhatsAppPontoCritico[];
};

type FileShareData = ShareData & {
  files: File[];
};

type FileShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function normalizeText(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text ? text : fallback;
}

function formatLabel(value: string | null | undefined, fallback: string) {
  return normalizeText(value, fallback);
}

function buildFileUrl(imageUrl: string) {
  try {
    return new URL(imageUrl, API_BASE).toString();
  } catch {
    return imageUrl;
  }
}

function getUniqueFotos(inspecao: WhatsAppInspection) {
  const fotos = new Map<string, FotoInspecao>();

  for (const foto of inspecao.fotos ?? []) fotos.set(foto.id, foto);
  for (const ponto of inspecao.pontosCriticos) {
    for (const foto of ponto.fotos ?? []) fotos.set(foto.id, foto);
  }

  return Array.from(fotos.values());
}

function getSafeFileName(fileName: string, fallback: string) {
  const cleanName = fileName.trim().replace(/[\\/:*?"<>|]+/g, "_");
  return cleanName || fallback;
}

async function buildShareFiles(inspecao: WhatsAppInspection) {
  const fotos = getUniqueFotos(inspecao);
  const files: File[] = [];

  for (const [index, foto] of fotos.entries()) {
    try {
      const response = await fetch(buildFileUrl(foto.imageUrl));
      if (!response.ok) continue;

      const blob = await response.blob();
      const fileName = getSafeFileName(foto.fileName, `foto-${index + 1}.jpg`);
      files.push(new File([blob], fileName, { type: blob.type || "image/jpeg" }));
    } catch {
      // Keep sharing the remaining files if one file cannot be loaded.
    }
  }

  return files;
}

async function copyTextToClipboard(text: string) {
  if (!navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatDateTimeBR(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMotivoNaoConformidade(value: string | null | undefined) {
  const labels: Record<string, string> = {
    FERRUGEM: "Ferrugem",
    MANCHA: "Mancha",
    AMARELAMENTO: "Amarelamento",
    ODOR: "Odor",
    PRODUTO_RESIDUAL: "Produto residual",
    VALVULA_CONTAMINADA: "Válvula contaminada",
    OUTRO: "Outro"
  };

  return value ? labels[value] ?? value : "Nao informada";
}

export function buildWhatsAppInspectionMessage(inspecao: WhatsAppInspection) {
  const observacao = normalizeText(inspecao.observacoesGerais, "Sem observacoes.");
  const inspetor = normalizeText(inspecao.nomeInspetor, "Nao informado");

  if (inspecao.tipoInspecao === "APOS_LAVAGEM") {
    const result = inspecao.resultadoPosLavagem ?? inspecao.status;
    const lines = [
      "INSPEÇÃO PÓS-LAVAGEM",
      "",
      `Frota: ${inspecao.frota?.numeroFrota ?? inspecao.frotaId}`,
      `Data/Hora: ${formatDateTimeBR(inspecao.dataInspecao)}`,
      `Inspetor: ${inspetor}`,
      `Colaborador Responsável: ${normalizeText(inspecao.colaborador?.nome, "Nao informado")}`,
      `Resultado: ${result}`
    ];

    if (result === "REPROVADO") {
      lines.push("", `Não Conformidade: ${formatMotivoNaoConformidade(inspecao.motivoNaoConformidade)}`);
    }

    lines.push("", "Observação:", observacao);
    return lines.join("\n");
  }

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
            return (
              `${prefix}` +
              `*Tipo:* ${formatLabel(ponto.categoria, "Nao informado")}\n` +
              `*Localizacao interna:* ${formatLabel(ponto.localizacao, "Nao informada")}\n` +
              `*Descricao:* ${formatLabel(ponto.descricao, "Nao informada")}\n` +
              `*Procedimento necessario:* ${formatLabel(ponto.procedimentoRecomendado, "Nao informado")}`
            );
          })
          .join("\n\n")
      : "*Ponto critico:*\nNenhum ponto critico registrado.";

  return [...header, "", pontos].join("\n");
}

export async function openWhatsAppInspectionMessage(inspecao: WhatsAppInspection) {
  const message = buildWhatsAppInspectionMessage(inspecao);
  const files = await buildShareFiles(inspecao);
  const shareNavigator = navigator as FileShareNavigator;

  if (files.length > 0 && navigator.share) {
    const copied = await copyTextToClipboard(message);
    if (copied) {
      window.alert("O texto da inspecao foi copiado. Depois de escolher o WhatsApp, cole o texto na mensagem junto com os arquivos.");
    }

    const shareData: FileShareData = {
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
