import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import HistoricoInspecoesPage from "./pages/HistoricoInspecoesPage";
import InspecaoDetalhePage from "./pages/InspecaoDetalhePage";
import LoginPage from "./pages/LoginPage";
import NovaInspecaoPage from "./pages/NovaInspecaoPage";
import RegistroFrotasPage from "./pages/RegistroFrotasPage";
import { isAuthenticated } from "./utils/auth";

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return _jsx(Navigate, { to: "/login", replace: true });
  }

  return children;
}

export default function App() {
  return _jsxs(Routes, {
    children: [
      _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }),
      _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(HomePage, {}) }) }),
      _jsx(Route, { path: "/nova-inspecao", element: _jsx(ProtectedRoute, { children: _jsx(NovaInspecaoPage, {}) }) }),
      _jsx(Route, { path: "/historico", element: _jsx(ProtectedRoute, { children: _jsx(HistoricoInspecoesPage, {}) }) }),
      _jsx(Route, { path: "/registro-frotas", element: _jsx(ProtectedRoute, { children: _jsx(RegistroFrotasPage, {}) }) }),
      _jsx(Route, { path: "/inspecao/:id", element: _jsx(ProtectedRoute, { children: _jsx(InspecaoDetalhePage, {}) }) }),
      _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })
    ]
  });
}
