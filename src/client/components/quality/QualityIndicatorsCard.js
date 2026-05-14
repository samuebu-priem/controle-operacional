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
  const rows = [
    { type: "section", cells: [sheet.title || sheet.name] },
    { type: "subtitle", cells: [sheet.subtitle || ""] },
    { type: "blank", cells: [] },
    { type: "header", cells: sheet.headers }
  ];
  const bodyRows = sheet.rows.length > 0 ? sheet.rows : [Array.from({ length: sheet.headers.length }, (_, index) => (index === 0 ? "Sem dados para este filtro." : ""))];
  bodyRows.forEach((row) => rows.push({ type: "data", cells: row }));
  return rows;
}
function getCellStyle(row, rowIndex, colIndex, sheet) {
  if (row.type === "section") return ' s="2"';
  if (row.type === "subtitle") return ' s="3"';
  if (row.type === "header") return ' s="1"';
  if (row.type === "blank") return ' s="4"';

  const header = sheet.headers?.[colIndex] ?? "";
  const value = row.cells[colIndex];
  const normalizedValue = String(value ?? "").toUpperCase();
  const isCentered = typeof value === "number" || ["#", "POSICAO", "OCORRENCIAS", "PERCENTUAL", "ARQUIVOS", "PONTOS CRITICOS", "QUANTIDADE"].includes(header.toUpperCase());
  const isZebra = rowIndex % 2 === 0;

  if (header === "Status") {
    if (normalizedValue === "APROVADO") return ' s="8"';
    if (normalizedValue === "REPROVADO") return ' s="9"';
    if (normalizedValue === "COM_OBSERVACAO") return ' s="10"';
  }

  if (header.includes("Severidade") || header === "Maior severidade") {
    if (normalizedValue === "GRAVE") return ' s="9"';
    if (normalizedValue === "MEDIA") return ' s="10"';
    if (normalizedValue === "LEVE") return ' s="8"';
  }

  if ((sheet.name === "Painel" && header === "Resultado") || (sheet.name === "Resumo dados" && header === "Valor")) return ' s="11"';
  if (isCentered) return isZebra ? ' s="7"' : ' s="6"';
  return isZebra ? ' s="5"' : "";
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
  const maxColumns = isTableSheet ? sheet.headers.length : Math.max(...sheet.sections.map((section) => section.headers.length));
  const cols = Array.from({ length: maxColumns }, (_, index) => {
      const values = allRows.map((row) => row.cells[index] ?? "");
      const preferredWidth = sheet.columnWidths?.[index];
      const width = preferredWidth ?? Math.min(58, Math.max(12, ...values.map((value) => String(value).length + 2)));
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");
  const sheetRows = allRows
    .map((row, rowIndex) => {
      const cells = Array.from({ length: maxColumns }, (_, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          const style = getCellStyle(row, rowIndex, colIndex, sheet);
          const value = row.cells[colIndex] ?? "";
          if (typeof value === "number") {
            return `<c r="${ref}"${style}><v>${value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeHtml(value)}</t></is></c>`;
        })
        .join("");
      const height = row.type === "section" ? ' ht="26" customHeight="1"' : row.type === "subtitle" ? ' ht="20" customHeight="1"' : row.type === "header" ? ' ht="24" customHeight="1"' : "";
      return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
    })
    .join("");
  const lastColumn = columnName(maxColumns - 1);
  const lastRef = `${lastColumn}${allRows.length}`;
  const mergeCells = allRows
    .map((row, index) => (row.type === "section" || row.type === "subtitle" ? `<mergeCell ref="A${index + 1}:${lastColumn}${index + 1}"/>` : ""))
    .filter(Boolean);
  const filterRef = isTableSheet ? `<autoFilter ref="A4:${lastColumn}${allRows.length}"/>` : "";
  const tabColor = sheet.tabColor ? `<sheetPr><tabColor rgb="${sheet.tabColor}"/></sheetPr>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      ${tabColor}
      <dimension ref="A1:${lastRef}"/>
      <sheetViews>
        <sheetView workbookViewId="0" showGridLines="0">
          <pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>
        </sheetView>
      </sheetViews>
      <cols>${cols}</cols>
      <sheetData>${sheetRows}</sheetData>
      ${filterRef}
      <mergeCells count="${mergeCells.length}">${mergeCells.join("")}</mergeCells>
      <pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
    </worksheet>`;
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
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <fonts count="7"><font><sz val="10"/><name val="Arial"/><color rgb="FF111827"/></font><font><b/><color rgb="FF111827"/><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FF111827"/><sz val="18"/><name val="Arial"/></font><font><color rgb="FF334155"/><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FF065F46"/><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FF991B1B"/><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FF92400E"/><sz val="10"/><name val="Arial"/></font></fonts>
      <fills count="9"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0F2FE"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFCCFBF1"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill></fills>
      <borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border><border><left style="medium"><color rgb="FF0F766E"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border></borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="12"><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyAlignment="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyAlignment="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="6" fillId="8" borderId="1" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="2" xfId="0" applyFill="1" applyFont="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>`;
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
  const subtitle = `Periodo: ${periodLabel} | Categoria: ${categoryLabel} | Gerado em: ${formatReportDate(/* @__PURE__ */ new Date())}`;
  const workbook = createXlsxWorkbook([
    {
      name: "Painel",
      title: "Painel executivo de qualidade",
      subtitle,
      headers: ["Bloco", "Indicador", "Resultado", "Leitura"],
      rows: dashboardRows,
      columnWidths: [24, 34, 24, 56],
      tabColor: "FF064E3B"
    },
    {
      name: "Resumo dados",
      title: "Resumo dos dados do relatorio",
      subtitle,
      headers: ["Indicador", "Valor", "Observacao"],
      rows: summaryRows,
      columnWidths: [30, 28, 52],
      tabColor: "FF0369A1"
    },
    {
      name: "Recorrencias",
      title: "Ranking de recorrencias",
      subtitle,
      headers: ["Posicao", "Categoria", "Ocorrencias", "Percentual", "Agrupamentos"],
      rows: rankingRows,
      columnWidths: [10, 28, 14, 14, 48],
      tabColor: "FF0F766E"
    },
    {
      name: "Severidade",
      title: "Distribuicao por severidade",
      subtitle,
      headers: ["Posicao", "Severidade", "Quantidade", "Percentual"],
      rows: severityRows,
      columnWidths: [10, 18, 14, 14],
      tabColor: "FFF59E0B"
    },
    {
      name: "Registro inspecoes",
      title: "Registro de inspecoes analisadas",
      subtitle,
      headers: ["#", "Data", "Frota", "Placa", "Equipamento", "Tipo inspecao", "Status", "Inspetor", "Pontos criticos", "Maior severidade", "Categorias", "Locais", "Arquivos", "Evidencias", "Observacoes"],
      rows: inspectionRows,
      columnWidths: [7, 20, 12, 14, 22, 18, 16, 24, 16, 18, 34, 34, 12, 46, 52],
      tabColor: "FF0369A1"
    },
    {
      name: "Pontos criticos",
      title: "Detalhamento dos pontos criticos",
      subtitle,
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
  const filteredInspecoes = useMemo(() => filterByPeriod(inspecoes, period, customStart, customEnd), [inspecoes, period, customStart, customEnd]);
  const categoryOptions = useMemo(() => buildCategoryOptions(filteredInspecoes), [filteredInspecoes]);
  const totalInspecoes = filteredInspecoes.length;
  const topIssues = useMemo(() => buildQualityAnalytics(filteredInspecoes, category), [filteredInspecoes, category]);
  const leadingIssue = topIssues.items[0]?.label ?? "\u2014";
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
      /* @__PURE__ */ jsx("h2", { className: "section-title", children: "Recorr\xEAncias encontradas nas inspe\xE7\xF5es" })
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
          /* @__PURE__ */ jsx("span", { children: "Total inspe\xE7\xF5es" }),
          /* @__PURE__ */ jsx("strong", { children: totalInspecoes })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "quality-kpi", children: [
          /* @__PURE__ */ jsx("span", { children: "Com ponto cr\xEDtico" }),
          /* @__PURE__ */ jsx("strong", { children: topIssues.withCriticalPoints })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "quality-kpi", children: [
          /* @__PURE__ */ jsx("span", { children: "Recorr\xEAncia l\xEDder" }),
          /* @__PURE__ */ jsx("strong", { children: leadingIssue })
        ] })
      ] }),
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
