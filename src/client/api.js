import { clearAuthSession } from "./utils/auth";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
async function request(path, init) {
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
        const error = (await response.json().catch(() => null));
        if (response.status === 401) {
            clearAuthSession();
            window.location.href = "/login";
        }
        throw new Error(error?.message ?? "Erro ao comunicar com a API");
    }
    return response.json();
}
export async function listFrotas() {
    return request("/api/frotas");
}
export async function loginUser(payload) {
    return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}
export async function updateMyProfile(payload) {
    return request("/api/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
    });
}
export async function searchFrotas(query) {
    return request(`/api/frotas/search?query=${encodeURIComponent(query)}`);
}
export async function getFrotaHistorico(id) {
    return request(`/api/inspecoes/frotas/${id}/historico`);
}
export async function getFrotaByNumero(numeroFrota) {
    return request(`/api/frotas/numero/${encodeURIComponent(numeroFrota)}/historico`);
}
export const getFrotaPorNumero = getFrotaByNumero;
export async function updateFrota(id, payload) {
    return request(`/api/frotas/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    });
}
export async function createInspecao(payload) {
    return request("/api/inspecoes", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}
export async function listInspecoes(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search?.trim())
        params.set("search", filters.search.trim());
    if (filters.frota?.trim())
        params.set("frota", filters.frota.trim());
    if (filters.placa?.trim())
        params.set("placa", filters.placa.trim());
    if (filters.from?.trim())
        params.set("from", filters.from.trim());
    if (filters.to?.trim())
        params.set("to", filters.to.trim());
    if (filters.status?.trim())
        params.set("status", filters.status.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/inspecoes${query}`);
}
export async function getInspecaoById(id) {
    return request(`/api/inspecoes/${id}`);
}
export async function updateInspecao(inspecaoId, payload) {
    return request(`/api/inspecoes/${inspecaoId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    });
}
export async function deleteInspecao(inspecaoId) {
    return request(`/api/inspecoes/${inspecaoId}`, {
        method: "DELETE"
    });
}
export async function deleteFoto(fotoId) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/api/fotos/${fotoId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (response.status === 401) {
            clearAuthSession();
            window.location.href = "/login";
        }
        throw new Error(error?.message ?? "Erro ao remover foto");
    }
}
export async function deleteFrota(frotaId) {
    return request(`/api/frotas/${frotaId}`, {
        method: "DELETE"
    });
}
export async function uploadFotos(inspecaoId, formData) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/api/inspecoes/${inspecaoId}/fotos`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
    });
    if (!response.ok) {
        const error = (await response.json().catch(() => null));
        if (response.status === 401) {
            clearAuthSession();
            window.location.href = "/login";
        }
        throw new Error(error?.message ?? "Erro ao enviar arquivos");
    }
    return response.json();
}

export async function uploadPostWashFotos(inspecaoId, formData) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/api/post-wash/inspections/${inspecaoId}/fotos`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
    });
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (response.status === 401) {
            clearAuthSession();
            window.location.href = "/login";
        }
        throw new Error(error?.message ?? "Erro ao enviar arquivos");
    }
    return response.json();
}

export async function listCollaborators(search = "") {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return request(`/api/post-wash/collaborators${query}`);
}

export async function createCollaborator(payload) {
    return request("/api/post-wash/collaborators", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function updateCollaborator(id, payload) {
    return request(`/api/post-wash/collaborators/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    });
}

export async function createPostWashInspection(payload) {
    return request("/api/post-wash/inspections", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function listPostWashInspections(filters = {}) {
    const params = new URLSearchParams();
    if (filters.frota?.trim())
        params.set("frota", filters.frota.trim());
    if (filters.colaborador?.trim())
        params.set("colaborador", filters.colaborador.trim());
    if (filters.colaboradorId?.trim())
        params.set("colaboradorId", filters.colaboradorId.trim());
    if (filters.resultado?.trim())
        params.set("resultado", filters.resultado.trim());
    if (filters.from?.trim())
        params.set("from", filters.from.trim());
    if (filters.to?.trim())
        params.set("to", filters.to.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/post-wash/inspections${query}`);
}

export async function getPostWashInspection(id) {
    return request(`/api/post-wash/inspections/${id}`);
}

export async function getPostWashDashboard(filters = {}) {
    const params = new URLSearchParams();
    if (filters.colaboradorId?.trim())
        params.set("colaboradorId", filters.colaboradorId.trim());
    if (filters.resultado?.trim())
        params.set("resultado", filters.resultado.trim());
    if (filters.from?.trim())
        params.set("from", filters.from.trim());
    if (filters.to?.trim())
        params.set("to", filters.to.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/post-wash/dashboard${query}`);
}

export async function getCollaboratorPerformance(id) {
    return request(`/api/post-wash/collaborators/${id}/performance`);
}
