const HOUR = 60 * 60 * 1000;

export function getYardFreshness(dateValue) {
    if (!dateValue) return { level: "unknown", label: "Sem localização", color: "gray", hours: null };
    const timestamp = new Date(dateValue).getTime();
    if (!Number.isFinite(timestamp)) return { level: "unknown", label: "Data inválida", color: "gray", hours: null };
    const age = Math.max(0, Date.now() - timestamp);
    const hours = age / HOUR;
    if (hours <= 2) return { level: "recent", label: "Até 2 horas", color: "green", hours };
    if (hours <= 6) return { level: "attention", label: "Entre 2 e 6 horas", color: "yellow", hours };
    return { level: "stale", label: "Acima de 6 horas", color: "red", hours };
}

export function formatElapsed(dateValue) {
    if (!dateValue) return "sem registro";
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000));
    if (seconds < 60) return "há menos de 1 minuto";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} minuto${minutes === 1 ? "" : "s"}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} hora${hours === 1 ? "" : "s"}`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia${days === 1 ? "" : "s"}`;
}
