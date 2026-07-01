import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ColaboradoresPage from "./pages/ColaboradoresPage";
import HistoricoInspecoesPage from "./pages/HistoricoInspecoesPage";
import InspecaoDetalhePage from "./pages/InspecaoDetalhePage";
import FrotaHistoricoPage from "./pages/FrotaHistoricoPage";
import LoginPage from "./pages/LoginPage";
import NovaInspecaoPage from "./pages/NovaInspecaoPage";
import ProfilePage from "./pages/ProfilePage";
import RegistroFrotasPage from "./pages/RegistroFrotasPage";
import RecorrenciaDetalhePage from "./pages/RecorrenciaDetalhePage";
import PainelGerencialPage from "./pages/PainelGerencialPage";
import { getAuthRole, isAuthenticated, isProfileComplete } from "./utils/auth";

function ProtectedRoute({ children, requireProfile = true, requireManager = false }) {
  if (!isAuthenticated()) {
    return _jsx(Navigate, { to: "/login", replace: true });
  }

  if (requireProfile && !isProfileComplete()) {
    return _jsx(Navigate, { to: "/perfil", replace: true });
  }

  if (requireManager && getAuthRole() !== "GESTOR") {
    return _jsx(Navigate, { to: "/", replace: true });
  }

  return children;
}

export default function App() {
  return _jsxs(Routes, {
    children: [
      _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }),
      _jsx(Route, { path: "/perfil", element: _jsx(ProtectedRoute, { requireProfile: false, children: _jsx(ProfilePage, {}) }) }),
      _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(HomePage, {}) }) }),
      _jsx(Route, { path: "/nova-inspecao", element: _jsx(ProtectedRoute, { children: _jsx(NovaInspecaoPage, {}) }) }),
      _jsx(Route, { path: "/colaboradores", element: _jsx(ProtectedRoute, { children: _jsx(ColaboradoresPage, {}) }) }),
      _jsx(Route, { path: "/historico", element: _jsx(ProtectedRoute, { children: _jsx(HistoricoInspecoesPage, {}) }) }),
      _jsx(Route, { path: "/frotas/:id/historico", element: _jsx(ProtectedRoute, { children: _jsx(FrotaHistoricoPage, {}) }) }),
      _jsx(Route, { path: "/recorrencias/:categoria", element: _jsx(ProtectedRoute, { children: _jsx(RecorrenciaDetalhePage, {}) }) }),
      _jsx(Route, { path: "/registro-frotas", element: _jsx(ProtectedRoute, { children: _jsx(RegistroFrotasPage, {}) }) }),
      _jsx(Route, { path: "/painel-gerencial", element: _jsx(ProtectedRoute, { requireManager: true, children: _jsx(PainelGerencialPage, {}) }) }),
      _jsx(Route, { path: "/inspecao/:id", element: _jsx(ProtectedRoute, { children: _jsx(InspecaoDetalhePage, {}) }) }),
      _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })
    ]
  });
}
