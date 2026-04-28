export function getAuthToken() {
    return localStorage.getItem("token");
}
export function isAuthenticated() {
    return Boolean(getAuthToken());
}
export function saveAuthSession(user, token) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
}
export function getAuthUser() {
    const rawUser = localStorage.getItem("user");
    if (!rawUser)
        return null;
    try {
        return JSON.parse(rawUser);
    }
    catch {
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
