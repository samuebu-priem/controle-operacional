import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { isGestor } from "../../utils/auth";
const main = [{ label: "In\xEDcio", icon: "\u2302", to: "/" }, { label: "Nova", icon: "\uFF0B", to: "/nova-inspecao" }, { label: "Hist\xF3rico", icon: "\u25F7", to: "/historico" }, { label: "Frotas", icon: "\u25A3", to: "/registro-frotas" }];
function BottomNav() {
  const [open, setOpen] = useState(false), navigate = useNavigate();
  const more = [{ label: "P\xE1tio", to: "/patio" }, { label: "Produtos", to: "/produtos" }, { label: "Perfil", to: "/perfil" }, ...isGestor() ? [{ label: "Painel gerencial", to: "/painel-gerencial" }] : []];
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("nav", { className: "bottom-nav bottom-nav--compact", "aria-label": "Navega\xE7\xE3o principal", children: [
      main.map((item) => /* @__PURE__ */ jsx(NavLink, { to: item.to, end: item.to === "/", children: ({ isActive }) => /* @__PURE__ */ jsxs("span", { className: `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`, children: [
        /* @__PURE__ */ jsx("i", { "aria-hidden": "true", children: item.icon }),
        item.label
      ] }) }, item.to)),
      /* @__PURE__ */ jsx("button", { type: "button", className: "bottom-nav__more", onClick: () => setOpen((v) => !v), "aria-expanded": open, children: /* @__PURE__ */ jsxs("span", { className: `bottom-nav__item ${open ? "bottom-nav__item--active" : ""}`, children: [
        /* @__PURE__ */ jsx("i", { "aria-hidden": "true", children: "\u2022\u2022\u2022" }),
        "Mais"
      ] }) })
    ] }),
    open ? /* @__PURE__ */ jsx("div", { className: "bottom-more-backdrop", onClick: () => setOpen(false), children: /* @__PURE__ */ jsxs("section", { className: "bottom-more-sheet", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxs("header", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Mais op\xE7\xF5es" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setOpen(false), "aria-label": "Fechar", children: "\xD7" })
      ] }),
      more.map((item) => /* @__PURE__ */ jsxs("button", { onClick: () => {
        setOpen(false);
        navigate(item.to);
      }, children: [
        item.label,
        /* @__PURE__ */ jsx("span", { children: "\u203A" })
      ] }, item.to))
    ] }) }) : null
  ] });
}
export {
  BottomNav as default
};
