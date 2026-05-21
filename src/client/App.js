import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ColaboradorDetalhePage from "./pages/ColaboradorDetalhePage";
import ColaboradoresPage from "./pages/ColaboradoresPage";
import DashboardPosLavagemPage from "./pages/DashboardPosLavagemPage";
import HistoricoInspecoesPage from "./pages/HistoricoInspecoesPage";
import HistoricoPosLavagemPage from "./pages/HistoricoPosLavagemPage";
import InspecaoExpressaPage from "./pages/InspecaoExpressaPage";
import InspecaoDetalhePage from "./pages/InspecaoDetalhePage";
import FrotaHistoricoPage from "./pages/FrotaHistoricoPage";
import LoginPage from "./pages/LoginPage";
import NovaInspecaoPage from "./pages/NovaInspecaoPage";
import NovaInspecaoPosLavagemPage from "./pages/NovaInspecaoPosLavagemPage";
import ProfilePage from "./pages/ProfilePage";
import RegistroFrotasPage from "./pages/RegistroFrotasPage";
import RecorrenciaDetalhePage from "./pages/RecorrenciaDetalhePage";
import { isAuthenticated, isProfileComplete } from "./utils/auth";

function ProtectedRoute({ children, requireProfile = true }) {
  if (!isAuthenticated()) {
    return _jsx(Navigate, { to: "/login", replace: true });
  }

  if (requireProfile && !isProfileComplete()) {
    return _jsx(Navigate, { to: "/perfil", replace: true });
  }

  return children;
}

export default function App() {
  return _jsxs(Routes, {
    children: [
      _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }),
      _jsx(Route, { path: "/perfil", element: _jsx(ProtectedRoute, { requireProfile: false, children: _jsx(ProfilePage, {}) }) }),
      _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(HomePage, {}) }) }),
      _jsx(Route, { path: "/inspecao-expressa", element: _jsx(ProtectedRoute, { children: _jsx(InspecaoExpressaPage, {}) }) }),
      _jsx(Route, { path: "/nova-inspecao", element: _jsx(ProtectedRoute, { children: _jsx(NovaInspecaoPage, {}) }) }),
      _jsx(Route, { path: "/pos-lavagem/nova", element: _jsx(ProtectedRoute, { children: _jsx(NovaInspecaoPosLavagemPage, {}) }) }),
      _jsx(Route, { path: "/pos-lavagem/historico", element: _jsx(ProtectedRoute, { children: _jsx(HistoricoPosLavagemPage, {}) }) }),
      _jsx(Route, { path: "/pos-lavagem/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPosLavagemPage, {}) }) }),
      _jsx(Route, { path: "/colaboradores", element: _jsx(ProtectedRoute, { children: _jsx(ColaboradoresPage, {}) }) }),
      _jsx(Route, { path: "/colaboradores/:id", element: _jsx(ProtectedRoute, { children: _jsx(ColaboradorDetalhePage, {}) }) }),
      _jsx(Route, { path: "/historico", element: _jsx(ProtectedRoute, { children: _jsx(HistoricoInspecoesPage, {}) }) }),
      _jsx(Route, { path: "/frotas/:id/historico", element: _jsx(ProtectedRoute, { children: _jsx(FrotaHistoricoPage, {}) }) }),
      _jsx(Route, { path: "/recorrencias/:categoria", element: _jsx(ProtectedRoute, { children: _jsx(RecorrenciaDetalhePage, {}) }) }),
      _jsx(Route, { path: "/registro-frotas", element: _jsx(ProtectedRoute, { children: _jsx(RegistroFrotasPage, {}) }) }),
      _jsx(Route, { path: "/inspecao/:id", element: _jsx(ProtectedRoute, { children: _jsx(InspecaoDetalhePage, {}) }) }),
      _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })
    ]
  });
}
