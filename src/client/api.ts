import type {
  ApiErrorResponse,
  Collaborator,
  FotoInspecao,
  Frota,
  Inspecao,
  PostWashFailureReason,
  PostWashInspection,
  PostWashInspectionResult,
  Severidade,
  StatusInspecao,
  TipoInspecao
} from "../shared/types";
import { clearAuthSession } from "./utils/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" })
    }
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    if (response.status === 401) {
      clearAuthSession();
      window.location.href = "/login";
    }
    throw new Error(error?.message ?? "Erro ao comunicar com a API");
  }

  return response.json() as Promise<T>;
}

export async function listFrotas() {
  return request<{ frotas: Frota[] }>("/api/frotas");
}

export async function loginUser(payload: { email: string; password: string }) {
  return request<{
    user: {
      id: string;
      name: string;
      fullName: string | null;
      jobTitle: string | null;
      email: string;
    };
    token: string;
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateMyProfile(payload: { fullName: string; jobTitle: string }) {
  return request<{
    user: {
      id: string;
      name: string;
      fullName: string | null;
      jobTitle: string | null;
      email: string;
    };
  }>("/api/auth/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function searchFrotas(query: string) {
  return request<{ frotas: Frota[] }>(`/api/frotas/search?query=${encodeURIComponent(query)}`);
}

export async function getFrotaHistorico(id: string) {
  return request<{
    frota: Frota;
    ultimaInspecao: Inspecao | null;
    inspecoes: Inspecao[];
    resumoRecorrencia: {
      itensRecorrentes: Array<{ categoria: string; localizacao: string; ocorrencias: number }>;
      mensagemResumo: string;
    } | null;
  }>(`/api/frotas/${id}/historico`);
}

export async function getFrotaByNumero(numeroFrota: string) {
  return request<{
    frota: Frota | null;
    ultimaInspecao: Inspecao | null;
    resumoRecorrencia: {
      itensRecorrentes: Array<{ categoria: string; localizacao: string; ocorrencias: number }>;
      mensagemResumo: string;
    } | null;
  }>(`/api/frotas/numero/${encodeURIComponent(numeroFrota)}/historico`);
}

export const getFrotaPorNumero = getFrotaByNumero;

export async function updateFrota(
  id: string,
  payload: Partial<{
    numeroFrota: string;
    placa: string;
    tipoEquipamento: string;
    material: string;
    capacidade: string;
    observacoesFixas: string | null;
  }>
) {
  return request<{ frota: Frota }>(`/api/frotas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function createInspecao(payload: {
  frotaId: string;
  numeroFrota: string;
  placa: string;
  tipoEquipamento: string;
  dataInspecao: string;
  tipoInspecao: TipoInspecao;
  status: StatusInspecao;
  observacoesGerais?: string | null;
  nomeInspetor: string;
  pontosCriticos: Array<{
    categoria: string;
    localizacao: string;
    descricao: string;
    severidade: Severidade;
    procedimentoRecomendado: string;
  }>;
}) {
  return request<{ inspecao: Inspecao }>("/api/inspecoes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listInspecoes(filters: {
  search?: string;
  frota?: string;
  placa?: string;
  from?: string;
  to?: string;
  status?: string;
} = {}) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.frota?.trim()) params.set("frota", filters.frota.trim());
  if (filters.placa?.trim()) params.set("placa", filters.placa.trim());
  if (filters.from?.trim()) params.set("from", filters.from.trim());
  if (filters.to?.trim()) params.set("to", filters.to.trim());
  if (filters.status?.trim()) params.set("status", filters.status.trim());

  const query = params.toString() ? `?${params.toString()}` : "";
  return request<{
    inspecoes: Array<Inspecao & { frota?: Pick<Frota, "numeroFrota" | "placa"> | null }>;
  }>(`/api/inspecoes${query}`);
}

export async function getInspecaoById(id: string) {
  return request<{
    inspecao: Inspecao & { frota?: Pick<Frota, "numeroFrota" | "placa"> | null };
  }>(`/api/inspecoes/${id}`);
}

export async function updateInspecao(
  inspecaoId: string,
  payload: {
    observacoesGerais?: string | null;
    pontosCriticos: Array<{
      id?: string;
      categoria: string;
      localizacao: string;
      descricao: string;
      severidade: Severidade;
      procedimentoRecomendado: string;
    }>;
    fotosToRemove?: string[];
  }
) {
  return request<{ inspecao: Inspecao }>(`/api/inspecoes/${inspecaoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteInspecao(inspecaoId: string) {
  return request<{ ok: true }>(`/api/inspecoes/${inspecaoId}`, {
    method: "DELETE"
  });
}

export async function deleteFoto(fotoId: string) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}/api/fotos/${fotoId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    if (response.status === 401) {
      clearAuthSession();
      window.location.href = "/login";
    }
    throw new Error(error?.message ?? "Erro ao remover foto");
  }
}

export async function deleteFrota(frotaId: string) {
  return request<{ ok: true }>(`/api/frotas/${frotaId}`, {
    method: "DELETE"
  });
}

export async function uploadFotos(inspecaoId: string, formData: FormData) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}/api/inspecoes/${inspecaoId}/fotos`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    if (response.status === 401) {
      clearAuthSession();
      window.location.href = "/login";
    }
    throw new Error(error?.message ?? "Erro ao enviar arquivos");
  }

  return response.json() as Promise<{ fotos: FotoInspecao[] }>;
}

export async function listCollaborators(search = "") {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return request<{ colaboradores: Collaborator[] }>(`/api/post-wash/collaborators${query}`);
}

export async function createCollaborator(payload: { nome: string; ativo?: boolean }) {
  return request<{ colaborador: Collaborator }>("/api/post-wash/collaborators", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateCollaborator(id: string, payload: Partial<{ nome: string; ativo: boolean }>) {
  return request<{ colaborador: Collaborator }>(`/api/post-wash/collaborators/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function createPostWashInspection(payload: {
  frota: string;
  colaboradorId: string;
  resultado: PostWashInspectionResult;
  motivo?: PostWashFailureReason | "";
  observacao?: string | null;
}) {
  return request<{ inspecao: PostWashInspection }>("/api/post-wash/inspections", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listPostWashInspections(filters: {
  frota?: string;
  colaborador?: string;
  colaboradorId?: string;
  resultado?: string;
  from?: string;
  to?: string;
} = {}) {
  const params = new URLSearchParams();
  if (filters.frota?.trim()) params.set("frota", filters.frota.trim());
  if (filters.colaborador?.trim()) params.set("colaborador", filters.colaborador.trim());
  if (filters.colaboradorId?.trim()) params.set("colaboradorId", filters.colaboradorId.trim());
  if (filters.resultado?.trim()) params.set("resultado", filters.resultado.trim());
  if (filters.from?.trim()) params.set("from", filters.from.trim());
  if (filters.to?.trim()) params.set("to", filters.to.trim());

  const query = params.toString() ? `?${params.toString()}` : "";
  return request<{ inspecoes: PostWashInspection[] }>(`/api/post-wash/inspections${query}`);
}

export async function getPostWashInspection(id: string) {
  return request<{ inspecao: PostWashInspection }>(`/api/post-wash/inspections/${id}`);
}

export async function getPostWashDashboard(filters: {
  colaboradorId?: string;
  resultado?: string;
  from?: string;
  to?: string;
} = {}) {
  const params = new URLSearchParams();
  if (filters.colaboradorId?.trim()) params.set("colaboradorId", filters.colaboradorId.trim());
  if (filters.resultado?.trim()) params.set("resultado", filters.resultado.trim());
  if (filters.from?.trim()) params.set("from", filters.from.trim());
  if (filters.to?.trim()) params.set("to", filters.to.trim());

  const query = params.toString() ? `?${params.toString()}` : "";
  return request<{
    resumo: {
      totalInspecoes: number;
      aprovadas: number;
      reprovadas: number;
      taxaAprovacao: number;
    };
    principaisMotivos: Array<{ motivo: PostWashFailureReason; motivoLabel: string; quantidade: number }>;
    evolucao: Array<{ periodo: string; total: number; aprovadas: number; reprovadas: number }>;
    indicadoresPorColaborador: Array<{
      colaboradorId: string;
      colaboradorNome: string;
      totalInspecoes: number;
      aprovacoes: number;
      reprovacoes: number;
      taxaAprovacao: number;
      principalMotivoFalha: { motivo: PostWashFailureReason; motivoLabel: string; total: number } | null;
      ultimaOcorrencia: PostWashInspection | null;
    }>;
  }>(`/api/post-wash/dashboard${query}`);
}

export async function getCollaboratorPerformance(id: string) {
  return request<{
    colaborador: Collaborator;
    resumo: {
      totalInspecoes: number;
      aprovadas: number;
      reprovadas: number;
      taxaAprovacao: number;
    };
    principaisNaoConformidades: Array<{ motivo: PostWashFailureReason; motivoLabel: string; quantidade: number }>;
    historicoRecente: PostWashInspection[];
    evolucaoMensal: Array<{ periodo: string; total: number; aprovadas: number; reprovadas: number }>;
    tendencia: string;
  }>(`/api/post-wash/collaborators/${id}/performance`);
}

export async function uploadPostWashFotos(inspecaoId: string, formData: FormData) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}/api/post-wash/inspections/${inspecaoId}/fotos`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    if (response.status === 401) {
      clearAuthSession();
      window.location.href = "/login";
    }
    throw new Error(error?.message ?? "Erro ao enviar arquivos");
  }

  return response.json() as Promise<{ fotos: PostWashInspection["fotos"] }>;
}
