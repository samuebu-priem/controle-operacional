import type { UserSession } from "../../shared/types";

type StoredUser = Omit<UserSession, "token">;

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function isProfileComplete() {
  const user = getAuthUser();
  return Boolean(user?.fullName?.trim() && user?.jobTitle?.trim());
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
