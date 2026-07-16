import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { requireGestor } from "../../middleware/permissions";
import { AppError } from "../../middleware/errorHandler";

export const productRoutes = Router();
const documentDir = path.resolve(process.cwd(), "uploads/products");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const productInclude = {
  family: true,
  manufacturer: true,
  aliases: true,
  documents: { orderBy: { createdAt: "desc" as const } }
};

const fields = ["name", "chemicalName", "internalCode", "unNumber", "physicalState", "color", "odor", "polarity", "solubility", "flammability", "corrosivity", "toxicity", "riskClass", "washType", "recommendedCleaningProducts", "criticalPoints", "residueHidePoints", "mainRejectionCauses", "approvalCriteria", "notes", "manualVersion"] as const;

function clean(value: unknown) { return String(value ?? "").trim(); }
function normalize(value: unknown) { return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function slug(value: unknown) { return normalize(value).replace(/\s+/g, "-"); }
function booleanValue(value: unknown) { return ["sim", "true", "1", "yes", "s"].includes(normalize(value)); }
function level(value: unknown): "LOW" | "MEDIUM" | "HIGH" {
  const v = normalize(value); return v.includes("alt") || v.includes("dificil") ? "HIGH" : v.includes("med") || v.includes("moder") ? "MEDIUM" : "LOW";
}
function keyMap(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalize(key).replace(/\s/g, ""), value]));
}
function pick(row: Record<string, unknown>, ...keys: string[]) {
  const mapped = keyMap(row); for (const key of keys) { const value = mapped[normalize(key).replace(/\s/g, "")]; if (clean(value)) return clean(value); } return "";
}
function rowToProduct(row: Record<string, unknown>) {
  const name = pick(row, "nome", "produto", "nome comercial", "name");
  return {
    name, chemicalName: pick(row, "nome químico", "nome quimico", "chemical name"), internalCode: pick(row, "código interno", "codigo", "internal code") || null,
    unNumber: pick(row, "número onu", "numero onu", "onu", "un") || null, manufacturerName: pick(row, "fabricante", "manufacturer"), familyName: pick(row, "família química", "familia", "family"),
    physicalState: pick(row, "estado físico", "estado fisico"), color: pick(row, "cor"), odor: pick(row, "odor"), polarity: pick(row, "polaridade"), solubility: pick(row, "solubilidade"),
    flammability: pick(row, "inflamabilidade"), corrosivity: pick(row, "corrosividade"), toxicity: pick(row, "toxicidade"), riskClass: pick(row, "classe de risco", "classe"), riskLevel: level(pick(row, "nível de risco", "nivel de risco", "risco")),
    requiresSteam: booleanValue(pick(row, "necessita vapor", "vapor")), washType: pick(row, "tipo de lavagem", "lavagem"), recommendedCleaningProducts: pick(row, "produtos de limpeza recomendados", "produto de limpeza"),
    washDifficulty: level(pick(row, "dificuldade de lavagem", "dificuldade")), averageWashMinutes: Number.parseInt(pick(row, "tempo médio", "tempo medio", "minutos"), 10) || null,
    criticalPoints: pick(row, "pontos críticos", "pontos criticos"), residueHidePoints: pick(row, "pontos onde costuma esconder resíduo", "pontos de resíduo"), mainRejectionCauses: pick(row, "principais causas de reprovação", "causas de reprovação"),
    approvalCriteria: pick(row, "critérios de aprovação", "criterios de aprovacao"), notes: pick(row, "observações", "observacoes"), manualVersion: pick(row, "versão do manual", "versao"),
    aliases: pick(row, "sinônimos", "sinonimos", "aliases").split(/[;,|]/).map((item) => item.trim()).filter(Boolean)
  };
}

async function parseFile(file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".xlsx") {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(file.buffer as any); const sheet = workbook.worksheets[0]; if (!sheet) return [];
    const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(clean); const rows: Record<string, unknown>[] = [];
    sheet.eachRow((row, index) => { if (index === 1) return; const values = (row.values as unknown[]).slice(1); rows.push(Object.fromEntries(headers.map((header, i) => [header, values[i] && typeof values[i] === "object" && "text" in (values[i] as any) ? (values[i] as any).text : values[i]]))); });
    return rows.map(rowToProduct).filter((p) => p.name);
  }
  if (ext === ".csv") {
    const lines = file.buffer.toString("utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()); if (!lines.length) return [];
    const delimiter = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
    const parseLine = (line: string) => { const result: string[] = []; let value = "", quoted = false; for (let i=0;i<line.length;i++) { const char=line[i]; if(char==='"'&&line[i+1]==='"'&&quoted){value+='"';i++;} else if(char==='"'){quoted=!quoted;} else if(char===delimiter&&!quoted){result.push(value);value="";} else value+=char; } result.push(value); return result; };
    const headers = parseLine(lines[0]); return lines.slice(1).map((line) => { const values=parseLine(line); return Object.fromEntries(headers.map((h,i)=>[h,values[i]??""])); }).map(rowToProduct).filter((p)=>p.name);
  }
  if (ext === ".pdf") {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      const blocks = result.text.split(/\n(?=(?:PRODUTO|Produto|Nome)\s*[:\-])/);
      const rows = blocks.map((block) => {
        const row: Record<string, string> = {};
        for (const line of block.split("\n")) { const match = line.match(/^\s*([^:]{2,55})\s*:\s*(.+)\s*$/); if (match) row[match[1]] = match[2]; }
        return rowToProduct(row);
      }).filter((p) => p.name);
      if (rows.length) return rows;
      const tableResult = await parser.getTable();
      const familyByPage: Record<number, string> = { 5: "Solventes oxigenados e álcoois", 6: "Hidrocarbonetos e combustíveis", 7: "Tensoativos e detergentes", 8: "Resinas, dispersões e látex", 9: "Óleos, aditivos e produtos viscosos", 10: "Poliisobutilenos e oligômeros", 11: "Aminas, glicóis e polióis", 12: "Ácidos, bases e produtos corrosivos", 13: "Produtos críticos e procedimentos especiais" };
      const tableProducts: any[] = [];
      for (const page of tableResult.pages) for (const table of page.tables) {
        const header = table[0]?.map(normalize) ?? []; if (!header[0]?.includes("produto") || !header.some((h) => h.includes("dific"))) continue;
        for (const cells of table.slice(1)) {
          const name = clean(cells[0]).replace(/\s*\n\s*/g, " "); if (!name) continue;
          const behavior = clean(cells[1]).replace(/\s*\n\s*/g, " "); const difficultyText = clean(cells[2]); const difficulty = Math.max(...(difficultyText.match(/\d+/g) ?? ["1"]).map(Number));
          const strategy = clean(cells[3]).replace(/\s*\n\s*/g, " "); const vapor = clean(cells[4]).replace(/\s*\n\s*/g, " "); const critical = clean(cells[5]).replace(/\s*\n\s*/g, " ");
          const combined = normalize(`${behavior} ${strategy} ${critical}`); const highRisk = /(toxic|explos|polimer|inflam|corros|oxidante|reativ)/.test(combined);
          tableProducts.push({ name, chemicalName: name, familyName: familyByPage[page.num] ?? `Manual técnico · página ${page.num}`, notes: behavior, washType: strategy, criticalPoints: critical, residueHidePoints: critical, mainRejectionCauses: critical, manualVersion: "Edição 1 / versão 1.0", requiresSteam: /util|opcional|sim/.test(normalize(vapor)), washDifficulty: difficulty >= 7 ? "HIGH" : difficulty >= 4 ? "MEDIUM" : "LOW", riskLevel: highRisk ? "HIGH" : difficulty >= 5 ? "MEDIUM" : "LOW", aliases: name.split(/\s+\/\s+/).map((v) => v.trim()).filter((v) => v !== name), recommendedCleaningProducts: strategy });
        }
      }
      if (!tableProducts.length) throw new AppError("O PDF não contém tabela ou campos reconhecíveis. Use a planilha-modelo.", 400, "UNSUPPORTED_PDF_LAYOUT");
      return tableProducts;
    } finally { await parser.destroy(); }
  }
  throw new AppError("Formato inválido. Envie PDF, XLSX ou CSV.", 400, "UNSUPPORTED_FILE");
}

async function upsertNamed(tx: any, model: "productFamily" | "manufacturer", name: string) {
  if (!name) return null; const normalizedSlug = slug(name);
  return tx[model].upsert({ where: { slug: normalizedSlug }, create: { name, slug: normalizedSlug }, update: { name } });
}

async function saveProduct(input: any, userId: string, source: string) {
  const normalizedName = normalize(input.name); if (!normalizedName) throw new AppError("Nome do produto é obrigatório", 400, "BAD_REQUEST");
  return prisma.$transaction(async (tx: any) => {
    const family = await upsertNamed(tx, "productFamily", clean(input.familyName));
    const manufacturer = await upsertNamed(tx, "manufacturer", clean(input.manufacturerName));
    const current = await tx.product.findFirst({ where: { OR: [...(input.id ? [{ id: input.id }] : []), { normalizedName }, ...(input.internalCode ? [{ internalCode: input.internalCode }] : [])] }, include: { aliases: true } });
    const data: any = { normalizedName, familyId: family?.id ?? null, manufacturerId: manufacturer?.id ?? null, riskLevel: level(input.riskLevel), requiresSteam: Boolean(input.requiresSteam), washDifficulty: level(input.washDifficulty), averageWashMinutes: input.averageWashMinutes ? Number(input.averageWashMinutes) : null, active: input.active !== false };
    for (const field of fields) data[field] = clean(input[field]) || null;
    data.name = clean(input.name);
    const product = current ? await tx.product.update({ where: { id: current.id }, data }) : await tx.product.create({ data });
    const aliases = Array.isArray(input.aliases) ? input.aliases : clean(input.aliases).split(/[;,|]/);
    for (const aliasName of aliases.map(clean).filter(Boolean)) await tx.productAlias.upsert({ where: { normalizedName: normalize(aliasName) }, create: { productId: product.id, name: aliasName, normalizedName: normalize(aliasName) }, update: { productId: product.id, name: aliasName } });
    await tx.productHistory.create({ data: { productId: product.id, changedById: userId, action: current ? "UPDATED" : "CREATED", source, changes: data } });
    return { product, created: !current };
  });
}

productRoutes.use(requireAuth);

productRoutes.get("/", async (req, res, next) => { try {
  const search = clean(req.query.search); const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
  const risk = clean(req.query.risk); const familyId = clean(req.query.familyId); const tokens = search.split(/\s+/).filter(Boolean);
  const where: any = { active: req.query.includeInactive === "true" ? undefined : true, ...(risk ? { riskLevel: risk } : {}), ...(familyId ? { familyId } : {}) };
  if (tokens.length) where.AND = tokens.map((token) => ({ OR: [{ name: { contains: token, mode: "insensitive" } }, { chemicalName: { contains: token, mode: "insensitive" } }, { unNumber: { contains: token, mode: "insensitive" } }, { riskClass: { contains: token, mode: "insensitive" } }, { manufacturer: { name: { contains: token, mode: "insensitive" } } }, { family: { name: { contains: token, mode: "insensitive" } } }, { aliases: { some: { name: { contains: token, mode: "insensitive" } } } }] }));
  const [products, total, families] = await Promise.all([prisma.product.findMany({ where, include: productInclude, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }), prisma.product.count({ where }), prisma.productFamily.findMany({ orderBy: { name: "asc" } })]);
  res.set("Cache-Control", "private, max-age=30"); return res.json({ products, families, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
} catch (e) { next(e); } });

productRoutes.get("/autocomplete", async (req, res, next) => { try {
  const search = clean(req.query.search); if (search.length < 2) return res.json({ products: [] });
  const products = await prisma.product.findMany({ where: { active: true, OR: [{ name: { contains: search, mode: "insensitive" } }, { chemicalName: { contains: search, mode: "insensitive" } }, { unNumber: { contains: search, mode: "insensitive" } }, { aliases: { some: { name: { contains: search, mode: "insensitive" } } } }] }, include: { family: true, manufacturer: true }, orderBy: { name: "asc" }, take: 12 });
  res.set("Cache-Control", "private, max-age=60"); return res.json({ products });
} catch (e) { next(e); } });

productRoutes.get("/dashboard", async (_req, res, next) => { try {
  const inspections = await prisma.productInspectionHistory.findMany({ include: { product: { include: { family: true } }, inspection: { include: { pontosCriticos: true } } } });
  const map = new Map<string, any>(); for (const item of inspections) { const row = map.get(item.productId) ?? { product: item.product, transported: 0, rejected: 0, totalMinutes: 0, timed: 0, recurrence: 0 }; row.transported++; if (item.inspection.status === "REPROVADO" || item.inspection.resultadoPosLavagem === "REPROVADO") row.rejected++; if (item.washTimeMinutes) { row.totalMinutes += item.washTimeMinutes; row.timed++; } row.recurrence += item.inspection.pontosCriticos.length; map.set(item.productId, row); }
  const rows = [...map.values()].map((r) => ({ ...r, averageMinutes: r.timed ? Math.round(r.totalMinutes / r.timed) : r.product.averageWashMinutes ?? 0 }));
  const families = await prisma.product.groupBy({ by: ["familyId"], where: { active: true }, _count: true }); const familyNames = await prisma.productFamily.findMany(); const names = new Map(familyNames.map((f: any) => [f.id, f.name]));
  return res.json({ mostTransported: [...rows].sort((a,b)=>b.transported-a.transported).slice(0,10), mostRejected: [...rows].sort((a,b)=>b.rejected-a.rejected).slice(0,10), longestWash: [...rows].sort((a,b)=>b.averageMinutes-a.averageMinutes).slice(0,10), mostSteam: rows.filter((r)=>r.product.requiresSteam).sort((a,b)=>b.transported-a.transported).slice(0,10), mostRecurring: [...rows].sort((a,b)=>b.recurrence-a.recurrence).slice(0,10), byFamily: families.map((f:any)=>({ name: names.get(f.familyId) ?? "Sem família", total: f._count })) });
} catch (e) { next(e); } });

productRoutes.post("/import", requireGestor, upload.single("file"), async (req, res, next) => { try {
  const authReq = req as AuthenticatedRequest; if (!req.file || !authReq.user) throw new AppError("Arquivo obrigatório", 400, "BAD_REQUEST");
  const products = await parseFile(req.file); await fs.mkdir(documentDir, { recursive: true }); const storedName = `${Date.now()}-${randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`; await fs.writeFile(path.join(documentDir, storedName), req.file.buffer);
  let created = 0, updated = 0; const importedIds: string[] = []; const errors: any[] = []; for (const [index, product] of products.entries()) { try { const result = await saveProduct(product, authReq.user.id, `IMPORT:${req.file.originalname}`); importedIds.push(result.product.id); result.created ? created++ : updated++; } catch (error) { errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Erro" }); } }
  if (importedIds.length) await prisma.productDocument.createMany({ data: [...new Set(importedIds)].map((productId) => ({ productId, uploadedById: authReq.user!.id, fileName: req.file!.originalname, fileUrl: `/uploads/products/${storedName}`, mimeType: req.file!.mimetype, version: clean(req.body.version) || null })) });
  return res.status(201).json({ summary: { read: products.length, created, updated, errors: errors.length }, errors });
} catch (e) { next(e); } });

productRoutes.post("/", requireGestor, async (req, res, next) => { try { const user = (req as AuthenticatedRequest).user!; const result = await saveProduct(req.body, user.id, "MANUAL"); return res.status(201).json(result); } catch (e) { next(e); } });

productRoutes.get("/:id", async (req, res, next) => { try { const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { ...productInclude, history: { orderBy: { createdAt: "desc" }, take: 30, include: { changedBy: { select: { name: true, fullName: true } } } }, inspections: { orderBy: { createdAt: "desc" }, take: 50, include: { inspection: { include: { frota: true, colaborador: true } } } } } }); if (!product) throw new AppError("Produto não encontrado", 404, "NOT_FOUND"); return res.json({ product }); } catch (e) { next(e); } });
productRoutes.patch("/:id", requireGestor, async (req, res, next) => { try { const current = await prisma.product.findUnique({ where: { id: req.params.id }, include: { aliases: true } }); if (!current) throw new AppError("Produto não encontrado", 404, "NOT_FOUND"); const result = await saveProduct({ ...current, ...req.body, name: req.body.name ?? current.name }, (req as AuthenticatedRequest).user!.id, "MANUAL"); return res.json(result); } catch (e) { next(e); } });
productRoutes.delete("/:id", requireGestor, async (req, res, next) => { try { const used = await prisma.productInspectionHistory.count({ where: { productId: req.params.id } }); if (used) { await prisma.product.update({ where: { id: req.params.id }, data: { active: false } }); } else { await prisma.product.delete({ where: { id: req.params.id } }); } return res.json({ ok: true, archived: used > 0 }); } catch (e) { next(e); } });
