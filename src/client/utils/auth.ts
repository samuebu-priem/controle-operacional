import type { UserSession } from "../../shared/types";

type StoredUser = Omit<UserSession, "token">;

export function getAuthToken() {
  return localStorage.getItem("token");
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return JSON.parse(decoded) as { exp?: number };
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

export function isAuthenticated() {
  const token = getAuthToken();
  if (!token) return false;

  if (isTokenExpired(token)) {
    clearAuthSession();
    return false;
  }

  return true;
}

export function isProfileComplete() {
  const user = getAuthUser();
  return Boolean(user?.fullName?.trim() && user?.jobTitle?.trim());
}

export function getAuthRole() {
  const role = getAuthUser()?.role?.toUpperCase();
  return role === "GESTOR" ? "GESTOR" : "INSPETOR";
}

export function isManager() {
  return getAuthRole() === "GESTOR";
}

export function saveAuthSession(user: StoredUser, token: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function saveAuthUser(user: StoredUser) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getAuthUser(): StoredUser | null {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as StoredUser;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("submanager_token");
  localStorage.removeItem("user");
  localStorage.removeItem("session");
}

export function logout() {
  clearAuthSession();
}
