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
    if (filters.productId?.trim())
        params.set("productId", filters.productId.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/inspecoes${query}`);
}
export async function getInspecaoById(id) {
    return request(`/api/inspecoes/${id}`);
}
export async function getDesempenhoDashboard(filters = {}) {
    const params = new URLSearchParams();
    if (filters.range?.trim())
        params.set("range", filters.range.trim());
    if (filters.from?.trim())
        params.set("from", filters.from.trim());
    if (filters.to?.trim())
        params.set("to", filters.to.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/inspecoes/desempenho${query}`);
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

export async function listCollaborators(search = "") {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return request(`/api/colaboradores${query}`);
}

export async function createCollaborator(payload) {
    return request("/api/colaboradores", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function updateCollaborator(id, payload) {
    return request(`/api/colaboradores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    });
}

export async function listYardFleets(search = "") {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    return request(`/api/yard/fleets?${params.toString()}`);
}

export async function getOperationalYardMap(branch = "PAULINIA") {
    return request(`/api/yard/dashboard?branch=${encodeURIComponent(branch)}`);
}

export async function getYardFleetLocation(fleetId) {
    return request(`/api/yard/fleets/${encodeURIComponent(fleetId)}/location?branch=PAULINIA`);
}

export async function getYardArea(areaId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    return request(`/api/yard/areas/${encodeURIComponent(areaId)}?${params.toString()}`);
}

export async function allocateYardFleetToArea(areaId, payload) {
    return request(`/api/yard/areas/${encodeURIComponent(areaId)}/allocations`, { method: "POST", body: JSON.stringify(payload) });
}

export async function previewYardBulkAllocation(areaId, identifiers) {
    return request(`/api/yard/areas/${encodeURIComponent(areaId)}/bulk-preview`, { method: "POST", body: JSON.stringify({ identifiers }) });
}

export async function bulkAllocateYardArea(areaId, payload) {
    return request(`/api/yard/areas/${encodeURIComponent(areaId)}/bulk-allocate`, { method: "POST", body: JSON.stringify(payload) });
}

export async function getYardHistory(fleetId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    return request(`/api/yard/fleets/${encodeURIComponent(fleetId)}/history?${params.toString()}`);
}

export async function allocateYardFleet(payload) {
    return request("/api/yard/allocations", { method: "POST", body: JSON.stringify(payload) });
}

export async function moveYardFleet(payload) {
    return request("/api/yard/allocations/move", { method: "POST", body: JSON.stringify(payload) });
}

export async function releaseYardFleet(allocationId, note = "") {
    return request(`/api/yard/allocations/${encodeURIComponent(allocationId)}/release`, { method: "POST", body: JSON.stringify({ note }) });
}

export async function createPatio(payload) {
    return request("/api/yard/patios", { method: "POST", body: JSON.stringify(payload) });
}

export async function createPatioArea(payload) {
    return request("/api/yard/areas", { method: "POST", body: JSON.stringify(payload) });
}

export async function updatePatioArea(id, payload) {
    return request(`/api/yard/areas/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function listProducts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
    return request(`/api/products?${params.toString()}`);
}
export async function autocompleteProducts(search) {
    return request(`/api/products/autocomplete?search=${encodeURIComponent(search)}`);
}
export async function getProduct(id) { return request(`/api/products/${encodeURIComponent(id)}`); }
export async function getProductDashboard() { return request("/api/products/dashboard"); }
export async function createProduct(payload) { return request("/api/products", { method: "POST", body: JSON.stringify(payload) }); }
export async function updateProduct(id, payload) { return request(`/api/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }); }
export async function deleteProduct(id) { return request(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export async function importProducts(file, version = "") {
    const form = new FormData(); form.append("file", file); if (version) form.append("version", version);
    return request("/api/products/import", { method: "POST", body: form });
}
