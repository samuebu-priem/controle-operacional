import { jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { strToU8, zipSync } from "fflate";
import Card from "../ui/Card";
import Button from "../ui/Button";
const PERIOD_LABELS = {
  THIS_MONTH: "Este m\xEAs",
  LAST_30_DAYS: "\xDAltimos 30 dias",
  LAST_90_DAYS: "\xDAltimos 90 dias",
  CUSTOM: "Personalizado"
};
const PALETTE = ["#22c55e", "#38bdf8", "#a78bfa", "#f59e0b", "#ef4444"];
const SEVERITY_ORDER = ["LEVE", "MEDIA", "GRAVE"];
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
  const now = /* @__PURE__ */ new Date();
  if (option === "CUSTOM") {
    if (!customStart || !customEnd) return null;
    return {
      from: startOfDay(new Date(customStart)),
      to: endOfDay(new Date(customEnd))
    };
  }
  if (option === "LAST_30_DAYS") {
    const from2 = new Date(now);
    from2.setDate(from2.getDate() - 30);
    return { from: startOfDay(from2), to: endOfDay(now) };
  }
  if (option === "LAST_90_DAYS") {
    const from2 = new Date(now);
    from2.setDate(from2.getDate() - 90);
    return { from: startOfDay(from2), to: endOfDay(now) };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: startOfDay(from), to: endOfDay(now) };
}
function normalizeLabel(value) {
  const trimmed = value.trim();
  const key = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (key.includes("ferrugem")) return "Ferrugem";
  if (key.includes("resquicio")) return "Resquicio de produto";
  if (key.includes("fuligem") || key.includes("fulligem")) return "Fuligem";
  if (key.includes("amarelamento")) return "Amarelamento";
  if (key.includes("mancha")) return "Mancha";
  return trimmed;
}
function buildCategoryOptions(inspecoes) {
  const labels = /* @__PURE__ */ new Set();
  inspecoes.forEach((inspecao) => {
    inspecao.pontosCriticos.forEach((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      if (label) labels.add(label);
    });
  });
  return [...labels].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
function buildQualityAnalytics(inspecoes, selectedCategory) {
  const frequency = /* @__PURE__ */ new Map();
  const severityFrequency = new Map(SEVERITY_ORDER.map((severity) => [severity, 0]));
  let totalCriticalPoints = 0;
  inspecoes.forEach((inspecao) => {
    inspecao.pontosCriticos.forEach((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      if (!label) return;
      if (selectedCategory !== "ALL" && label !== selectedCategory) return;
      frequency.set(label, (frequency.get(label) ?? 0) + 1);
      severityFrequency.set(ponto.severidade, (severityFrequency.get(ponto.severidade) ?? 0) + 1);
      totalCriticalPoints += 1;
    });
  });
  const sorted = [...frequency.entries()].sort((a, b) => b[1] - a[1]);
  const topFive = sorted.slice(0, 5);
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  const others = total - topFive.reduce((sum, [, count]) => sum + count, 0);
  const items = topFive.map(([label, count], index) => ({
    label,
    count,
    percentage: total > 0 ? count / total * 100 : 0,
    color: PALETTE[index % PALETTE.length],
    labels: [label]
  }));
  if (others > 0) {
    items.push({
      label: "Outros",
      count: others,
      percentage: total > 0 ? others / total * 100 : 0,
      color: "#64748b",
      labels: sorted.slice(5).map(([label]) => label)
    });
  }
  const severityItems = SEVERITY_ORDER.map((severity) => {
    const count = severityFrequency.get(severity) ?? 0;
    return {
      label: severity,
      count,
      percentage: totalCriticalPoints > 0 ? count / totalCriticalPoints * 100 : 0
    };
  });
  const withCriticalPoints = inspecoes.filter(
    (inspecao) => inspecao.pontosCriticos.some((ponto) => {
      const label = normalizeLabel(ponto.categoria);
      return selectedCategory === "ALL" || label === selectedCategory;
    })
  ).length;
  return { items, total, severityItems, withCriticalPoints };
}
function filterByPeriod(inspecoes, option, customStart, customEnd) {
  const range = getPeriodRange(option, customStart, customEnd);
  if (!range) return [];
  return inspecoes.filter((inspecao) => {
    const date = new Date(inspecao.dataInspecao);
    return date >= range.from && date <= range.to;
  });
}
function formatReportDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR");
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function getMatchingPoints(inspecao, selectedCategory) {
  return (inspecao.pontosCriticos ?? []).filter((ponto) => {
    const label = normalizeLabel(ponto.categoria);
    return selectedCategory === "ALL" || label === selectedCategory;
  });
}
function getPhotoItems(inspecao, points) {
  const photos = [...(inspecao.fotos ?? []), ...points.flatMap((ponto) => ponto.fotos ?? [])];
  const unique = /* @__PURE__ */ new Map();
  photos.forEach((foto) => {
    const key = foto.id ?? foto.imageUrl ?? foto.fileName;
    if (key) unique.set(key, foto);
  });
  return [...unique.values()];
}
function getHighestSeverity(points) {
  const rank = { LEVE: 1, MEDIA: 2, GRAVE: 3 };
  return points.reduce((highest, ponto) => {
    if ((rank[ponto.severidade] ?? 0) > (rank[highest] ?? 0)) return ponto.severidade;
    return highest;
  }, "LEVE");
}
function joinUnique(values, fallback = "") {
  const unique = [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
  return unique.length > 0 ? unique.join(" | ") : fallback;
}
function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - mod) / 26);
  }
  return name;
}
function buildTableSheetRows(sheet) {
  const generatedAt = sheet.generatedAt || formatReportDate(/* @__PURE__ */ new Date());
  const totalRecords = sheet.recordCount ?? sheet.rows.length;
  const context = sheet.context || [];
  const kpis = sheet.kpis || [];
  const rows = [
    { type: "brand", cells: ["CONTROLE OPERACIONAL", "Relatorio corporativo"] },
    { type: "title", cells: [sheet.title || sheet.name] },
    { type: "meta", cells: [`Exportado em ${generatedAt}`, `Registros: ${totalRecords}`, "Responsavel: Usuario do sistema"] },
    { type: "context", cells: [context.length > 0 ? context.join(" | ") : sheet.subtitle || ""] },
    { type: "blank", cells: [] },
    { type: "kpiLabel", cells: kpis.map((kpi) => kpi.label) },
    { type: "kpiValue", cells: kpis.map((kpi) => kpi.value) },
    { type: "blank", cells: [] },
    { type: "header", cells: sheet.headers }
  ];
  const bodyRows = sheet.rows.length > 0 ? sheet.rows : [Array.from({ length: sheet.headers.length }, (_, index) => (index === 0 ? "Sem dados para este filtro." : ""))];
  bodyRows.forEach((row) => rows.push({ type: "data", cells: row }));
  return rows;
}
function normalizeKey(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
function isDateHeader(header) {
  const key = normalizeKey(header);
  return key.includes("DATA") || key.includes("GERADO") || key.includes("HORA");
}
function isMoneyHeader(header) {
  const key = normalizeKey(header);
  return key.includes("VALOR") || key.includes("FATUR") || key.includes("PRECO") || key.includes("CUSTO") || key.includes("RECEITA");
}
function isPercentHeader(header) {
  return normalizeKey(header).includes("PERCENTUAL") || normalizeKey(header).includes("%");
}
function isIntegerHeader(header) {
  const key = normalizeKey(header);
  return ["#", "POSICAO", "OCORRENCIAS", "ARQUIVOS", "PONTOS CRITICOS", "QUANTIDADE"].includes(key) || key.includes("TOTAL") || key.includes("QTD");
}
function parsePercent(value) {
  if (typeof value === "number") return value > 1 ? value / 100 : value;
  const match = String(value ?? "").trim().replace(",", ".").match(/^(-?\d+(?:\.\d+)?)%$/);
  return match ? Number(match[1]) / 100 : null;
}
function excelSerialDate(value) {
  const stringValue = String(value ?? "").trim();
  const brDate = stringValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  let date = null;
  if (brDate) {
    date = new Date(Number(brDate[3]), Number(brDate[2]) - 1, Number(brDate[1]), Number(brDate[4] ?? 0), Number(brDate[5] ?? 0), Number(brDate[6] ?? 0));
  } else if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    date = new Date(value);
  }
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.getTime() / 86400000 + 25569;
}
function getStatusStyle(normalizedValue) {
  if (["APROVADO", "ACTIVE", "OK", "CONCLUIDO"].includes(normalizedValue)) return 13;
  if (["REPROVADO", "FAILED", "GRAVE", "CRITICO"].includes(normalizedValue)) return 14;
  if (["COM_OBSERVACAO", "PENDING", "MEDIA", "ATENCAO"].includes(normalizedValue)) return 15;
  if (["CANCELED", "CANCELADO", "INATIVO", "SEM PONTO CRITICO"].includes(normalizedValue)) return 16;
  if (["LEVE", "BAIXO"].includes(normalizedValue)) return 13;
  return null;
}
function getCellStyleId(row, rowIndex, colIndex, sheet) {
  if (row.type === "brand") return colIndex === 0 ? 1 : 2;
  if (row.type === "title") return 3;
  if (row.type === "meta") return 4;
  if (row.type === "context") return 5;
  if (row.type === "kpiLabel") return 6;
  if (row.type === "kpiValue") return 7;
  if (row.type === "header") return 8;
  if (row.type === "blank") return 9;
  if (row.type === "section") return 3;
  if (row.type === "subtitle") return 5;

  const header = sheet.headers?.[colIndex] ?? "";
  const value = row.cells[colIndex];
  const normalizedValue = normalizeKey(value);
  const isZebra = rowIndex % 2 === 0;
  const badgeStyle = getStatusStyle(normalizedValue);
  if (normalizeKey(header).includes("STATUS") || normalizeKey(header).includes("SEVERIDADE") || header === "Maior severidade") {
    if (badgeStyle) return badgeStyle;
  }
  if (isDateHeader(header) && excelSerialDate(value) !== null) return isZebra ? 21 : 20;
  if (isPercentHeader(header) && parsePercent(value) !== null) return isZebra ? 23 : 22;
  if (isMoneyHeader(header) && typeof value === "number") return isZebra ? 25 : 24;
  if (typeof value === "number" || isIntegerHeader(header)) return isZebra ? 19 : 18;
  if ((sheet.name === "Painel" && header === "Resultado") || (sheet.name === "Resumo dados" && header === "Valor")) return 17;
  return isZebra ? 11 : 10;
}
function getCellStyle(row, rowIndex, colIndex, sheet) {
  return ` s="${getCellStyleId(row, rowIndex, colIndex, sheet)}"`;
}
function buildSingleSheetRows(sections) {
  const rows = [];
  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) rows.push({ type: "blank", cells: [] });
    rows.push({ type: "section", cells: [section.title] });
    if (section.subtitle) rows.push({ type: "subtitle", cells: [section.subtitle] });
    rows.push({ type: "header", cells: section.headers });
    const bodyRows = section.rows.length > 0 ? section.rows : [["Sem dados para este filtro."]];
    bodyRows.forEach((row) => rows.push({ type: "data", cells: row }));
  });
  return rows;
}
function worksheetXml(sheet) {
  const isTableSheet = Boolean(sheet.headers);
  const allRows = isTableSheet ? buildTableSheetRows(sheet) : buildSingleSheetRows(sheet.sections);
  const maxColumns = Math.max(
    isTableSheet ? sheet.headers.length : Math.max(...sheet.sections.map((section) => section.headers.length)),
    sheet.kpis?.length ?? 0,
    sheet.context?.length ?? 0,
    4
  );
  const cols = Array.from({ length: maxColumns }, (_, index) => {
      const values = allRows.map((row) => row.cells[index] ?? "");
      const preferredWidth = sheet.columnWidths?.[index];
      const width = preferredWidth ?? Math.min(58, Math.max(12, ...values.map((value) => String(value).length + 4)));
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");
  const sheetRows = allRows
    .map((row, rowIndex) => {
      const cells = Array.from({ length: maxColumns }, (_, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          const style = getCellStyle(row, rowIndex, colIndex, sheet);
          const header = sheet.headers?.[colIndex] ?? "";
          const value = row.cells[colIndex] ?? "";
          if (typeof value === "number") {
            return `<c r="${ref}"${style}><v>${value}</v></c>`;
          }
          const dateValue = row.type === "data" && isDateHeader(header) ? excelSerialDate(value) : null;
          if (dateValue !== null) return `<c r="${ref}"${style}><v>${dateValue}</v></c>`;
          const percentValue = row.type === "data" && isPercentHeader(header) ? parsePercent(value) : null;
          if (percentValue !== null) return `<c r="${ref}"${style}><v>${percentValue}</v></c>`;
          return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeHtml(value)}</t></is></c>`;
        })
        .join("");
      const height = row.type === "brand" ? ' ht="30" customHeight="1"' : row.type === "title" ? ' ht="38" customHeight="1"' : row.type === "meta" || row.type === "context" ? ' ht="24" customHeight="1"' : row.type === "kpiLabel" ? ' ht="22" customHeight="1"' : row.type === "kpiValue" ? ' ht="34" customHeight="1"' : row.type === "section" ? ' ht="30" customHeight="1"' : row.type === "subtitle" ? ' ht="22" customHeight="1"' : row.type === "header" ? ' ht="28" customHeight="1"' : row.type === "data" ? ' ht="24" customHeight="1"' : "";
      return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
    })
    .join("");
  const lastColumn = columnName(maxColumns - 1);
  const lastRef = `${lastColumn}${allRows.length}`;
  const mergeCells = allRows
    .map((row, index) => (["brand", "title", "context", "section", "subtitle"].includes(row.type) ? `<mergeCell ref="A${index + 1}:${lastColumn}${index + 1}"/>` : ""))
    .filter(Boolean);
  const filterStart = isTableSheet ? allRows.findIndex((row) => row.type === "header") + 1 : 0;
  const filterRef = isTableSheet ? `<autoFilter ref="A${filterStart}:${lastColumn}${allRows.length}"/>` : "";
  const tabColor = sheet.tabColor ? `<sheetPr><tabColor rgb="${sheet.tabColor}"/></sheetPr>` : "";
  const freezeRow = isTableSheet ? filterStart + 1 : 5;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      ${tabColor}
      <dimension ref="A1:${lastRef}"/>
      <sheetViews>
        <sheetView workbookViewId="0" showGridLines="0">
          <pane ySplit="${freezeRow - 1}" topLeftCell="A${freezeRow}" activePane="bottomLeft" state="frozen"/>
        </sheetView>
      </sheetViews>
      <sheetFormatPr defaultRowHeight="22"/>
      <cols>${cols}</cols>
      <sheetData>${sheetRows}</sheetData>
      ${filterRef}
      <mergeCells count="${mergeCells.length}">${mergeCells.join("")}</mergeCells>
      <printOptions horizontalCentered="1"/>
      <pageMargins left="0.35" right="0.35" top="0.55" bottom="0.55" header="0.25" footer="0.25"/>
      <pageSetup orientation="${maxColumns > 8 ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>
    </worksheet>`;
}
function buildWorkbookStyles() {
  const fonts = [
    '<font><sz val="10"/><name val="Aptos"/><color rgb="FF111827"/></font>',
    '<font><b/><sz val="11"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font>',
    '<font><b/><sz val="22"/><name val="Aptos Display"/><color rgb="FFFFFFFF"/></font>',
    '<font><sz val="10"/><name val="Aptos"/><color rgb="FFE2E8F0"/></font>',
    '<font><b/><sz val="9"/><name val="Aptos"/><color rgb="FF64748B"/></font>',
    '<font><b/><sz val="18"/><name val="Aptos Display"/><color rgb="FF0F172A"/></font>',
    '<font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF0F172A"/></font>',
    '<font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF166534"/></font>',
    '<font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF991B1B"/></font>',
    '<font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF92400E"/></font>',
    '<font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF475569"/></font>',
    '<font><b/><sz val="12"/><name val="Aptos"/><color rgb="FF0369A1"/></font>'
  ].join("");
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE0F2FE"/><bgColor indexed="64"/></patternFill></fill>'
  ].join("");
  const borders = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>',
    '<border><left style="medium"><color rgb="FF0EA5E9"/></left><right style="thin"><color rgb="FFBAE6FD"/></right><top style="thin"><color rgb="FFBAE6FD"/></top><bottom style="thin"><color rgb="FFBAE6FD"/></bottom><diagonal/></border>',
    '<border><left style="thin"><color rgb="FF86EFAC"/></left><right style="thin"><color rgb="FF86EFAC"/></right><top style="thin"><color rgb="FF86EFAC"/></top><bottom style="thin"><color rgb="FF86EFAC"/></bottom><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFFCA5A5"/></left><right style="thin"><color rgb="FFFCA5A5"/></right><top style="thin"><color rgb="FFFCA5A5"/></top><bottom style="thin"><color rgb="FFFCA5A5"/></bottom><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFFCD34D"/></left><right style="thin"><color rgb="FFFCD34D"/></right><top style="thin"><color rgb="FFFCD34D"/></top><bottom style="thin"><color rgb="FFFCD34D"/></bottom><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>'
  ].join("");
  const xfs = [
    '<xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="6" fillId="4" borderId="2" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="4" fillId="6" borderId="6" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="5" fillId="5" borderId="6" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="1" fillId="3" borderId="6" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyAlignment="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyAlignment="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="7" fillId="8" borderId="3" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="8" fillId="9" borderId="4" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="9" fillId="10" borderId="5" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="10" fillId="11" borderId="6" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="11" fillId="12" borderId="2" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="1" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="1" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="10" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="10" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="165" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="165" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>'
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/><numFmt numFmtId="165" formatCode="R$ #,##0.00"/></numFmts>
      <fonts count="12">${fonts}</fonts>
      <fills count="13">${fills}</fills>
      <borders count="7">${borders}</borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="26">${xfs}</cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
      <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
    </styleSheet>`;
}
function createXlsxWorkbook(sheets) {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
      ${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
      <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
      <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
    </Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
      <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
    </Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets>
        ${sheets.map((sheet, index) => `<sheet name="${escapeHtml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}
      </sheets>
    </workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}
      <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    </Relationships>`;
  const styles = buildWorkbookStyles();
  const now = new Date().toISOString();
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Relatorio de Indicadores de Qualidade</dc:title><dc:creator>Controle Operacional</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Controle Operacional</Application></Properties>`;
  const files = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRels),
    "docProps/core.xml": strToU8(core),
    "docProps/app.xml": strToU8(app),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
    "xl/styles.xml": strToU8(styles)
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet));
  });
  return zipSync(files);
}
function exportQualitySpreadsheet({ inspecoes, analytics, period, category, customStart, customEnd }) {
  const periodLabel = period === "CUSTOM" ? `${customStart || "inicio"} a ${customEnd || "fim"}` : PERIOD_LABELS[period];
  const categoryLabel = category === "ALL" ? "Todas" : category;
  const totalPoints = analytics.items.reduce((sum, item) => sum + item.count, 0);
  const inspectionRows = inspecoes.map((inspecao, index) => {
    const points = getMatchingPoints(inspecao, category);
    const photos = getPhotoItems(inspecao, points);
    return [
      index + 1,
      formatReportDate(inspecao.dataInspecao),
      inspecao.frota?.numeroFrota ?? inspecao.frotaId ?? "",
      inspecao.frota?.placa ?? "",
      inspecao.frota?.tipoEquipamento ?? "",
      inspecao.tipoInspecao,
      inspecao.status,
      inspecao.nomeInspetor,
      points.length,
      points.length > 0 ? getHighestSeverity(points) : "Sem ponto critico",
      joinUnique(points.map((ponto) => normalizeLabel(ponto.categoria)), "Sem ponto critico"),
      joinUnique(points.map((ponto) => ponto.localizacao), "Sem ponto critico"),
      photos.length,
      photos.length > 0 ? photos.map((foto) => foto.fileName || foto.imageUrl).join(" | ") : "Sem arquivo informado",
      inspecao.observacoesGerais ?? ""
    ];
  });
  let pointRowNumber = 0;
  const pointRows = inspecoes.flatMap((inspecao) =>
    getMatchingPoints(inspecao, category).map((ponto) => {
      const photos = getPhotoItems(inspecao, [ponto]);
      pointRowNumber += 1;
      return [
        pointRowNumber,
        formatReportDate(inspecao.dataInspecao),
        inspecao.frota?.numeroFrota ?? inspecao.frotaId ?? "",
        inspecao.frota?.placa ?? "",
        inspecao.status,
        normalizeLabel(ponto.categoria),
        ponto.localizacao,
        ponto.severidade,
        ponto.descricao,
        ponto.procedimentoRecomendado,
        photos.length > 0 ? photos.map((foto) => foto.imageUrl || foto.fileName).join(" | ") : "Sem arquivo informado"
      ];
    })
  );
  const summaryRows = [
    ["Gerado em", formatReportDate(/* @__PURE__ */ new Date()), "Arquivo criado pelo Controle Operacional"],
    ["Periodo analisado", periodLabel, "Filtro aplicado na tela"],
    ["Categoria filtrada", categoryLabel, "Todas ou uma categoria especifica"],
    ["Total de inspecoes", inspecoes.length, "Quantidade de registros no periodo"],
    ["Inspecoes com ponto critico", analytics.withCriticalPoints, "Registros com ocorrencia de qualidade"],
    ["Total de ocorrencias", totalPoints, "Soma dos pontos criticos filtrados"],
    ["Recorrencia lider", analytics.items[0]?.label ?? "Sem recorrencia", "Categoria com maior volume"]
  ];
  const rankingRows = analytics.items.map((item, index) => [index + 1, item.label, item.count, `${Math.round(item.percentage)}%`, (item.labels ?? [item.label]).join(" | ")]);
  const severityRows = analytics.severityItems.map((item, index) => [index + 1, item.label, item.count, `${Math.round(item.percentage)}%`]);
  const dashboardRows = [
    ["Contexto", "Periodo analisado", periodLabel, "Filtro aplicado ao relatorio"],
    ["Contexto", "Categoria", categoryLabel, "Base de recorrencias considerada"],
    ["Operacao", "Inspecoes no periodo", inspecoes.length, "Total de registros analisados"],
    ["Operacao", "Inspecoes com ponto critico", analytics.withCriticalPoints, "Registros que exigem atencao"],
    ["Qualidade", "Ocorrencias registradas", totalPoints, "Soma dos pontos criticos filtrados"],
    ["Qualidade", "Recorrencia lider", analytics.items[0]?.label ?? "Sem recorrencia", analytics.items[0] ? `${analytics.items[0].count} ocorrencias (${Math.round(analytics.items[0].percentage)}%)` : "Sem volume no filtro"],
    ...analytics.items.slice(0, 5).map((item, index) => ["Pizza de recorrencias", `${index + 1}. ${item.label}`, `${Math.round(item.percentage)}%`, `${item.count} ocorrencias`]),
    ...analytics.severityItems.map((item) => ["Severidade", item.label, `${Math.round(item.percentage)}%`, `${item.count} ocorrencias`])
  ];
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const generatedAt = formatReportDate(/* @__PURE__ */ new Date());
  const subtitle = `Periodo: ${periodLabel} | Categoria: ${categoryLabel} | Gerado em: ${generatedAt}`;
  const criticalRate = inspecoes.length > 0 ? Math.round(analytics.withCriticalPoints / inspecoes.length * 100) : 0;
  const leadingRecurrence = analytics.items[0]?.label ?? "Sem recorrencia";
  const commonContext = [`Periodo: ${periodLabel}`, `Categoria: ${categoryLabel}`, `Base: ${inspecoes.length} inspecoes`];
  const executiveKpis = [
    { label: "Inspecoes", value: inspecoes.length },
    { label: "Com ponto critico", value: analytics.withCriticalPoints },
    { label: "Ocorrencias", value: totalPoints },
    { label: "Taxa critica", value: `${criticalRate}%` },
    { label: "Recorrencia lider", value: leadingRecurrence }
  ];
  const workbook = createXlsxWorkbook([
    {
      name: "Painel",
      title: "Painel executivo de qualidade",
      subtitle,
      generatedAt,
      recordCount: dashboardRows.length,
      context: commonContext,
      kpis: executiveKpis,
      headers: ["Bloco", "Indicador", "Resultado", "Leitura"],
      rows: dashboardRows,
      columnWidths: [24, 34, 24, 56],
      tabColor: "FF064E3B"
    },
    {
      name: "Resumo dados",
      title: "Resumo dos dados do relatorio",
      subtitle,
      generatedAt,
      recordCount: summaryRows.length,
      context: commonContext,
      kpis: [
        { label: "Total inspecoes", value: inspecoes.length },
        { label: "Pontos criticos", value: totalPoints },
        { label: "Taxa critica", value: `${criticalRate}%` }
      ],
      headers: ["Indicador", "Valor", "Observacao"],
      rows: summaryRows,
      columnWidths: [30, 28, 52],
      tabColor: "FF0369A1"
    },
    {
      name: "Recorrencias",
      title: "Ranking de recorrencias",
      subtitle,
      generatedAt,
      recordCount: rankingRows.length,
      context: commonContext,
      kpis: [
        { label: "Categorias", value: rankingRows.length },
        { label: "Ocorrencias", value: totalPoints },
        { label: "Lider", value: leadingRecurrence }
      ],
      headers: ["Posicao", "Categoria", "Ocorrencias", "Percentual", "Agrupamentos"],
      rows: rankingRows,
      columnWidths: [10, 28, 14, 14, 48],
      tabColor: "FF0F766E"
    },
    {
      name: "Severidade",
      title: "Distribuicao por severidade",
      subtitle,
      generatedAt,
      recordCount: severityRows.length,
      context: commonContext,
      kpis: [
        { label: "Leve", value: severityRows.find((row) => row[1] === "LEVE")?.[2] ?? 0 },
        { label: "Media", value: severityRows.find((row) => row[1] === "MEDIA")?.[2] ?? 0 },
        { label: "Grave", value: severityRows.find((row) => row[1] === "GRAVE")?.[2] ?? 0 }
      ],
      headers: ["Posicao", "Severidade", "Quantidade", "Percentual"],
      rows: severityRows,
      columnWidths: [10, 18, 14, 14],
      tabColor: "FFF59E0B"
    },
    {
      name: "Registro inspecoes",
      title: "Registro de inspecoes analisadas",
      subtitle,
      generatedAt,
      recordCount: inspectionRows.length,
      context: commonContext,
      kpis: [
        { label: "Registros", value: inspectionRows.length },
        { label: "Com evidencias", value: inspectionRows.filter((row) => row[12] > 0).length },
        { label: "Com ponto critico", value: analytics.withCriticalPoints },
        { label: "Taxa critica", value: `${criticalRate}%` }
      ],
      headers: ["#", "Data", "Frota", "Placa", "Equipamento", "Tipo inspecao", "Status", "Inspetor", "Pontos criticos", "Maior severidade", "Categorias", "Locais", "Arquivos", "Evidencias", "Observacoes"],
      rows: inspectionRows,
      columnWidths: [7, 20, 12, 14, 22, 18, 16, 24, 16, 18, 34, 34, 12, 46, 52],
      tabColor: "FF0369A1"
    },
    {
      name: "Pontos criticos",
      title: "Detalhamento dos pontos criticos",
      subtitle,
      generatedAt,
      recordCount: pointRows.length,
      context: commonContext,
      kpis: [
        { label: "Pontos criticos", value: pointRows.length },
        { label: "Inspecoes afetadas", value: analytics.withCriticalPoints },
        { label: "Recorrencia lider", value: leadingRecurrence }
      ],
      headers: ["#", "Data", "Frota", "Placa", "Status", "Categoria", "Localizacao", "Severidade", "Descricao", "Procedimento", "Arquivos / links"],
      rows: pointRows,
      columnWidths: [7, 20, 12, 14, 16, 24, 28, 14, 46, 46, 46],
      tabColor: "FF7F1D1D"
    }
  ]);
  const blob = new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-qualidade-${stamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
function DonutChart({ items }) {
  const size = 240;
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, current) => sum + current.count, 0);
  const leading = items[0];
  const gap = items.length > 1 ? 3.5 : 0;
  let cumulative = 0;
  return /* @__PURE__ */ jsxs("div", { className: "quality-donut", children: [
    /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, role: "img", "aria-label": "Gr\xE1fico de recorr\xEAncias", children: [
      /* @__PURE__ */ jsx(
        "defs",
        {
          children: /* @__PURE__ */ jsx("filter", { id: "qualityDonutGlow", x: "-35%", y: "-35%", width: "170%", height: "170%", children: /* @__PURE__ */ jsx("feDropShadow", { dx: "0", dy: "8", stdDeviation: "8", floodColor: "#020617", floodOpacity: "0.38" }) })
        }
      ),
      /* @__PURE__ */ jsx(
        "circle",
        {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          fill: "none",
          stroke: "rgba(148, 163, 184, 0.12)",
          strokeWidth
        }
      ),
      /* @__PURE__ */ jsx(
        "circle",
        {
          className: "quality-donut__inner-ring",
          cx: size / 2,
          cy: size / 2,
          r: radius - strokeWidth / 2 - 8
        }
      ),
      items.map((item) => {
        const rawDash = item.count / total * circumference;
        const dash = Math.max(0, rawDash - gap);
        const offset = circumference - cumulative;
        cumulative += rawDash;
        return /* @__PURE__ */ jsxs(
          "circle",
          {
            className: "quality-donut__segment",
            cx: size / 2,
            cy: size / 2,
            r: radius,
            fill: "none",
            stroke: item.color,
            strokeWidth,
            strokeDasharray: `${dash} ${circumference - dash}`,
            strokeDashoffset: offset,
            transform: `rotate(-90 ${size / 2} ${size / 2})`,
            strokeLinecap: "round",
            filter: "url(#qualityDonutGlow)",
            children: /* @__PURE__ */ jsx("title", { children: `${item.label}: ${item.count} ocorr\xEAncias (${Math.round(item.percentage)}%)` })
          },
          item.label
        );
      })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "quality-donut__center", children: [
      /* @__PURE__ */ jsx("strong", { children: total }),
      /* @__PURE__ */ jsx("span", { children: "ocorr\xEAncias" }),
      leading ? /* @__PURE__ */ jsxs("small", { children: [
        Math.round(leading.percentage),
        "% ",
        leading.label
      ] }) : null
    ] })
  ] });
}
function QualityIndicatorsCard({ inspecoes }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("THIS_MONTH");
  const [category, setCategory] = useState("ALL");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const filteredInspecoes = useMemo(() => filterByPeriod(inspecoes, period, customStart, customEnd).filter((inspecao) => inspecao.tipoInspecao === "APOS_LAVAGEM"), [inspecoes, period, customStart, customEnd]);
  const categoryOptions = useMemo(() => buildCategoryOptions(filteredInspecoes), [filteredInspecoes]);
  const totalInspecoes = filteredInspecoes.length;
  const totalAprovadas = filteredInspecoes.filter((inspecao) => (inspecao.resultadoPosLavagem ?? inspecao.status) === "APROVADO").length;
  const taxaAprovacao = totalInspecoes > 0 ? Math.round(totalAprovadas / totalInspecoes * 100) : 0;
  const topIssues = useMemo(() => buildQualityAnalytics(filteredInspecoes, category), [filteredInspecoes, category]);
  const leadingIssue = topIssues.items[0]?.label ?? "\u2014";
  const collaboratorIndicators = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    filteredInspecoes.forEach((inspecao) => {
      const id = inspecao.colaboradorId ?? "sem-colaborador";
      const current = map.get(id) ?? {
        id,
        nome: inspecao.colaborador?.nome ?? "Sem colaborador informado",
        total: 0,
        aprovadas: 0,
        reprovadas: 0
      };
      current.total += 1;
      if ((inspecao.resultadoPosLavagem ?? inspecao.status) === "APROVADO") current.aprovadas += 1;
      if ((inspecao.resultadoPosLavagem ?? inspecao.status) === "REPROVADO") current.reprovadas += 1;
      map.set(id, current);
    });
    return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [filteredInspecoes]);
  function openIssuePage(item) {
    const params = new URLSearchParams();
    params.set("labels", (item.labels ?? [item.label]).join("|"));
    params.set("period", period);
    if (period === "CUSTOM") {
      if (customStart) params.set("from", customStart);
      if (customEnd) params.set("to", customEnd);
    }
    navigate(`/recorrencias/${encodeURIComponent(item.label)}?${params.toString()}`);
  }
  function handleExportReport() {
    exportQualitySpreadsheet({
      inspecoes: filteredInspecoes,
      analytics: topIssues,
      period,
      category,
      customStart,
      customEnd
    });
  }
  return /* @__PURE__ */ jsxs("section", { className: "quality-section", children: [
    /* @__PURE__ */ jsx("div", { className: "section-head quality-section__head", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "card-label", children: "Indicadores de Qualidade" }),
      /* @__PURE__ */ jsx("h2", { className: "section-title", children: "Desempenho e nao conformidades pos-lavagem" })
    ] }) }),
    /* @__PURE__ */ jsxs(Card, { className: "quality-card card--elevated", children: [
      /* @__PURE__ */ jsxs("div", { className: "quality-toolbar", children: [
        /* @__PURE__ */ jsxs("label", { className: "input-field quality-select", children: [
          /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Per\xEDodo" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "select",
              value: period,
              onChange: (event) => setPeriod(event.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "THIS_MONTH", children: PERIOD_LABELS.THIS_MONTH }),
                /* @__PURE__ */ jsx("option", { value: "LAST_30_DAYS", children: PERIOD_LABELS.LAST_30_DAYS }),
                /* @__PURE__ */ jsx("option", { value: "LAST_90_DAYS", children: PERIOD_LABELS.LAST_90_DAYS }),
                /* @__PURE__ */ jsx("option", { value: "CUSTOM", children: PERIOD_LABELS.CUSTOM })
              ]
            }
          )
        ] }),
        period === "CUSTOM" ? /* @__PURE__ */ jsxs("div", { className: "quality-custom-dates", children: [
          /* @__PURE__ */ jsxs("label", { className: "input-field", children: [
            /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Data inicial" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "input",
                type: "date",
                value: customStart,
                onChange: (event) => setCustomStart(event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "input-field", children: [
            /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Data final" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "input",
                type: "date",
                value: customEnd,
                onChange: (event) => setCustomEnd(event.target.value)
              }
            )
          ] })
        ] }) : null,
        /* @__PURE__ */ jsxs("label", { className: "input-field quality-select", children: [
          /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Categoria" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "select",
              value: category,
              onChange: (event) => setCategory(event.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "ALL", children: "Todas" }),
                categoryOptions.map((option) => /* @__PURE__ */ jsx("option", { value: option, children: option }, option))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "quality-export-action", children: /* @__PURE__ */ jsx(Button, { type: "button", variant: "secondary", onClick: handleExportReport, children: "Exportar relatorio" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "quality-kpis", children: [
        /* @__PURE__ */ jsxs("article", { className: "quality-kpi", children: [
          /* @__PURE__ */ jsx("span", { children: "Inspecoes pos-lavagem" }),
          /* @__PURE__ */ jsx("strong", { children: totalInspecoes })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "quality-kpi", children: [
          /* @__PURE__ */ jsx("span", { children: "Aprovacoes" }),
          /* @__PURE__ */ jsx("strong", { children: totalAprovadas })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "quality-kpi", children: [
          /* @__PURE__ */ jsx("span", { children: "Taxa aprovacao" }),
          /* @__PURE__ */ jsx("strong", { children: `${taxaAprovacao}%` })
        ] })
      ] }),
      collaboratorIndicators.length > 0 ? /* @__PURE__ */ jsxs("div", { className: "quality-table-panel", children: [
        /* @__PURE__ */ jsx("div", { className: "quality-table-panel__head", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "card-label", children: "Historico por colaborador" }),
          /* @__PURE__ */ jsx("h3", { className: "section-title", children: "Indicadores para melhoria continua" })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "recurrence-summary", children: collaboratorIndicators.map((item) => /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: item.nome }),
          /* @__PURE__ */ jsx("strong", { children: `${item.aprovadas}/${item.total}` }),
          /* @__PURE__ */ jsxs("small", { className: "helper", children: [item.reprovadas, " pontos de atencao"] })
        ] }, item.id)) })
      ] }) : null,
      /* @__PURE__ */ jsxs("div", { className: "quality-layout", children: [
        /* @__PURE__ */ jsxs("div", { className: "quality-chart-panel", children: [
          topIssues.items.length > 0 ? /* @__PURE__ */ jsx(DonutChart, { items: topIssues.items }) : /* @__PURE__ */ jsx("p", { className: "helper", children: "Sem ocorr\xEAncias no per\xEDodo." }),
          /* @__PURE__ */ jsx("div", { className: "quality-legend", children: topIssues.items.map((item) => /* @__PURE__ */ jsxs("div", { className: "quality-legend__item", children: [
            /* @__PURE__ */ jsx("span", { className: "quality-legend__swatch", style: { backgroundColor: item.color } }),
            /* @__PURE__ */ jsx("span", { children: item.label }),
            /* @__PURE__ */ jsxs("strong", { children: [
              item.count,
              " \u2022 ",
              Math.round(item.percentage),
              "%"
            ] })
          ] }, item.label)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "quality-ranking", children: [
          /* @__PURE__ */ jsx("h3", { className: "section-title", children: "Top recorr\xEAncias" }),
          /* @__PURE__ */ jsxs("div", { className: "quality-ranking__list", children: [
            topIssues.items.map((item, index) => /* @__PURE__ */ jsxs("div", { className: "quality-ranking__item", style: { "--issue-color": item.color }, children: [
              /* @__PURE__ */ jsx("span", { className: "quality-ranking__position", children: index + 1 }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("strong", { children: item.label }),
                /* @__PURE__ */ jsxs("p", { className: "helper", children: [
                  item.count,
                  " ocorr\xEAncias \u2022 ",
                  Math.round(item.percentage),
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsx(Button, { type: "button", variant: "secondary", onClick: () => openIssuePage(item), children: "Abrir" })
            ] }, item.label)),
            topIssues.items.length === 0 ? /* @__PURE__ */ jsx("p", { className: "helper", children: "Nenhum item para listar." }) : null
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "quality-insights", children: [
          /* @__PURE__ */ jsxs("div", { className: "quality-insight-panel", children: [
            /* @__PURE__ */ jsx("h3", { className: "section-title", children: "Severidade" }),
            /* @__PURE__ */ jsx("div", { className: "quality-bars", children: topIssues.severityItems.map((item) => /* @__PURE__ */ jsxs("div", { className: "quality-bar-row", children: [
              /* @__PURE__ */ jsx("span", { children: item.label }),
              /* @__PURE__ */ jsx("div", { className: "quality-bar-track", children: /* @__PURE__ */ jsx("span", { style: { width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` } }) }),
              /* @__PURE__ */ jsx("strong", { children: item.count })
            ] }, item.label)) })
          ] }),
        ] })
      ] })
    ] })
  ] });
}
export {
  QualityIndicatorsCard as default
};
