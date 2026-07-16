import { createElement as h, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deleteInspecao, getInspecaoById, listInspecoes } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { openWhatsAppInspectionMessage } from "../utils/whatsapp";

const PAGE_SIZE = 12;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const date = (value) => new Date(value).toLocaleDateString("pt-BR");
const time = (value) => new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const typeLabel = (value) => value === "APOS_LAVAGEM" ? "Pós-lavagem" : "Pré-lavagem";
const resultOf = (item) => item.resultadoPosLavagem || item.status || "REGISTRADA";
const statusClass = (value) => value === "REPROVADO" ? "status status--danger" : value === "APROVADO" ? "status status--success" : "status status--neutral";
const searchText = (item) => normalize([item.frota?.numeroFrota, item.frota?.placa, item.product?.name, item.product?.chemicalName, item.colaborador?.nome, item.tipoInspecao, resultOf(item), date(item.dataInspecao)].join(" "));

function HistoryActions({ item, onOpen, onDelete, onWhatsApp, compact = false }) {
  return h("div", { className: `history-actions${compact ? " history-actions--compact" : ""}` },
    h(Button, { type: "button", variant: "secondary", onClick: () => onOpen(item.id) }, "Ver inspeção"),
    !compact ? h(Button, { type: "button", variant: "ghost", onClick: () => onWhatsApp(item.id), "aria-label": "Abrir no WhatsApp" }, "WhatsApp") : null,
    !compact ? h(Button, { type: "button", variant: "danger", onClick: () => onDelete(item.id) }, "Excluir") : null
  );
}

function HistoryTable({ items, handlers }) {
  return h("div", { className: "history-desktop data-table-system" }, h("table", null,
    h("thead", null, h("tr", null, ...["Data", "Frota", "Produto", "Tipo", "Inspetor", "Resultado", "Ações"].map((label) => h("th", { key: label }, label)))),
    h("tbody", null, items.map((item) => h("tr", { key: item.id },
      h("td", null, h("strong", null, date(item.dataInspecao)), h("small", null, time(item.dataInspecao))),
      h("td", null, h("strong", null, item.frota?.numeroFrota || "—"), h("small", null, item.frota?.placa || "Sem placa")),
      h("td", { className: "history-product-cell" }, item.product?.name || "Não informado"),
      h("td", null, typeLabel(item.tipoInspecao)),
      h("td", null, item.colaborador?.nome || "Não informado"),
      h("td", null, h("span", { className: statusClass(resultOf(item)) }, resultOf(item))),
      h("td", null, h(HistoryActions, { item, ...handlers }))
    )))
  ));
}

function HistoryCards({ items, handlers }) {
  return h("div", { className: "history-mobile" }, items.map((item) => h("article", { className: "history-mobile-card", key: item.id },
    h("header", null, h("strong", null, `Frota ${item.frota?.numeroFrota || "não informada"}`), h("span", { className: statusClass(resultOf(item)) }, resultOf(item))),
    h("h2", null, item.product?.name || "Produto não informado"),
    h("p", null, `${date(item.dataInspecao)} às ${time(item.dataInspecao)}`),
    h("dl", null,
      h("div", null, h("dt", null, "Inspetor"), h("dd", null, item.colaborador?.nome || "Não informado")),
      h("div", null, h("dt", null, "Tipo"), h("dd", null, typeLabel(item.tipoInspecao)))
    ),
    h(HistoryActions, { item, compact: true, ...handlers })
  )));
}

export default function HistoricoInspecoesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("frota") || "");
  const [type, setType] = useState("TODAS");
  const [result, setResult] = useState("TODOS");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const response = await listInspecoes(); setItems(response.inspecoes || []); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao carregar histórico"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { setPage(1); }, [query, type, result]);

  const filtered = useMemo(() => items.filter((item) => (!normalize(query) || searchText(item).includes(normalize(query))) && (type === "TODAS" || item.tipoInspecao === type) && (result === "TODOS" || resultOf(item) === result)), [items, query, type, result]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function remove(id) { if (!window.confirm("Excluir inspeção?")) return; await deleteInspecao(id); setItems((current) => current.filter((item) => item.id !== id)); }
  async function whatsapp(id) { const response = await getInspecaoById(id); await openWhatsAppInspectionMessage(response.inspecao); }
  const handlers = { onOpen: (id) => navigate(`/inspecao/${id}`), onDelete: (id) => void remove(id), onWhatsApp: (id) => void whatsapp(id) };

  return h(AppLayout, null, h("div", { className: "page-frame history-page history-page-v2" },
    h(AppHeader, { title: "Histórico de Inspeções", subtitle: "Consulte inspeções, produtos e resultados.", showBack: true }),
    h("section", { className: "history-filters-v2", "aria-label": "Filtros do histórico" },
      h(Input, { label: "Pesquisar", value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Frota, placa, produto, inspetor ou data" }),
      h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Tipo"), h("select", { className: "input", value: type, onChange: (event) => setType(event.target.value) }, h("option", { value: "TODAS" }, "Todos"), h("option", { value: "ANTES_LAVAGEM" }, "Pré-lavagem"), h("option", { value: "APOS_LAVAGEM" }, "Pós-lavagem"))),
      h("label", { className: "input-field" }, h("span", { className: "input-field__label" }, "Resultado"), h("select", { className: "input", value: result, onChange: (event) => setResult(event.target.value) }, h("option", { value: "TODOS" }, "Todos"), h("option", { value: "APROVADO" }, "Aprovado"), h("option", { value: "REPROVADO" }, "Reprovado"))),
      h(Button, { variant: "secondary", onClick: () => { setQuery(""); setType("TODAS"); setResult("TODOS"); } }, "Limpar filtros")
    ),
    error ? h("p", { className: "notice notice--error" }, error) : null,
    loading ? h("div", { className: "loading-state-system" }, h("i"), h("span", null, "Carregando inspeções...")) : null,
    !loading && visible.length ? h(HistoryTable, { items: visible, handlers }) : null,
    !loading && visible.length ? h(HistoryCards, { items: visible, handlers }) : null,
    !loading && !visible.length ? h("div", { className: "empty-state-system" }, h("strong", null, "Nenhuma inspeção encontrada"), h("p", null, "Ajuste os filtros para consultar outros registros.")) : null,
    filtered.length > PAGE_SIZE ? h("nav", { className: "pagination-v2", "aria-label": "Paginação" }, h(Button, { variant: "secondary", disabled: page === 1, onClick: () => setPage((value) => value - 1) }, "Anterior"), h("span", null, `Página ${page} de ${pages}`), h(Button, { variant: "secondary", disabled: page === pages, onClick: () => setPage((value) => value + 1) }, "Próxima")) : null
  ));
}
