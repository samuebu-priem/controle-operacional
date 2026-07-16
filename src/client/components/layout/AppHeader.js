import { createElement as h, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthRole, getAuthUser, logout } from "../../utils/auth";
import AppNav from "./AppNav";
import { metadataFor } from "./pageMetadata";

const initials = (name) => String(name || "Usuário").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

export default function AppHeader({ title, subtitle, description, actions = null, showBack = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const metadata = metadataFor(location.pathname);
  const user = getAuthUser() || {};
  const name = user.fullName || user.name || user.email || "Usuário";
  const role = getAuthRole() === "GESTOR" ? "Gestor" : "Inspetor";
  const [userOpen, setUserOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");

  useEffect(() => {
    document.querySelector(".app-shell")?.classList.toggle("app-shell--sidebar-collapsed", collapsed);
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    document.body.classList.toggle("navigation-drawer-open", drawerOpen);
    return () => document.body.classList.remove("navigation-drawer-open");
  }, [drawerOpen]);

  useEffect(() => {
    function close(event) { if (event.key === "Escape") { setUserOpen(false); setDrawerOpen(false); } else if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserOpen(false); }
    document.addEventListener("keydown", close); document.addEventListener("pointerdown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };
  }, []);

  function signOut() { if (!window.confirm("Deseja sair do sistema?")) return; logout(); navigate("/login", { replace: true }); }
  const pageTitle = title || metadata.title;
  const pageDescription = description || subtitle || metadata.description;

  return h("header", { className: "app-header-v2" },
    h("div", { className: "app-header-v2__bar" },
      h("button", { type: "button", className: "header-icon-button header-sidebar-toggle", "aria-label": collapsed ? "Expandir menu lateral" : "Recolher menu lateral", "aria-expanded": !collapsed, onClick: () => setCollapsed((value) => !value) }, "☰"),
      h("button", { type: "button", className: "header-icon-button header-mobile-toggle", "aria-label": drawerOpen ? "Fechar menu de navegação" : "Abrir menu de navegação", "aria-expanded": drawerOpen, onClick: () => setDrawerOpen((value) => !value) }, drawerOpen ? "×" : "☰"),
      showBack ? h("button", { type: "button", className: "header-icon-button header-back", "aria-label": "Voltar", onClick: () => navigate(-1) }, "←") : null,
      h("div", { className: "app-header-v2__identity" }, h("span", { className: "app-header-v2__brand" }, "Controle Operacional"), h("div", { className: "app-header-v2__title" }, h("h1", null, pageTitle), pageDescription ? h("p", null, pageDescription) : null)),
      actions ? h("div", { className: "app-header-v2__actions" }, actions) : null,
      h("div", { className: "user-menu", ref: userMenuRef },
        h("button", { type: "button", className: "user-menu__trigger", "aria-label": "Abrir menu do usuário", "aria-expanded": userOpen, "aria-haspopup": "menu", onClick: () => setUserOpen((value) => !value) }, h("span", { className: "user-avatar" }, initials(name)), h("span", { className: "user-menu__summary" }, h("strong", null, name), h("small", null, role)), h("i", { "aria-hidden": "true" }, "⌄")),
        userOpen ? h("div", { className: "user-menu__dropdown", role: "menu" }, h("div", { className: "user-menu__profile" }, h("span", { className: "user-avatar" }, initials(name)), h("div", null, h("strong", null, name), h("small", null, role))), h("button", { type: "button", role: "menuitem", onClick: () => { setUserOpen(false); navigate("/perfil"); } }, "Minha conta"), h("button", { type: "button", role: "menuitem", onClick: () => { setUserOpen(false); navigate("/perfil"); } }, "Configurações"), h("button", { type: "button", role: "menuitem", className: "user-menu__logout", onClick: signOut }, "Sair")) : null
      )
    ),
    drawerOpen ? h("div", { className: "navigation-drawer-backdrop", onClick: () => setDrawerOpen(false) }, h("aside", { className: "navigation-drawer", onClick: (event) => event.stopPropagation(), role: "dialog", "aria-modal": "true", "aria-label": "Menu de navegação" }, h(AppNav, { className: "app-nav--drawer", onNavigate: () => setDrawerOpen(false) }))) : null
  );
}
