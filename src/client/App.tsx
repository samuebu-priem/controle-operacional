import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import HomePage from "./pages/HomePage";
import HistoricoInspecoesPage from "./pages/HistoricoInspecoesPage";
import InspecaoDetalhePage from "./pages/InspecaoDetalhePage";
import LoginPage from "./pages/LoginPage";
import NovaInspecaoPage from "./pages/NovaInspecaoPage";
import RegistroFrotasPage from "./pages/RegistroFrotasPage";
import { isAuthenticated } from "./utils/auth";

type ProtectedRouteProps = {
  children: ReactNode;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/nova-inspecao" element={<ProtectedRoute><NovaInspecaoPage /></ProtectedRoute>} />
      <Route path="/historico" element={<ProtectedRoute><HistoricoInspecoesPage /></ProtectedRoute>} />
      <Route path="/registro-frotas" element={<ProtectedRoute><RegistroFrotasPage /></ProtectedRoute>} />
      <Route path="/inspecao/:id" element={<ProtectedRoute><InspecaoDetalhePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
