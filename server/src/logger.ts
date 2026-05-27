type LogDetails = Record<string, unknown>;

export function logInfo(message: string, details?: LogDetails): void {
    log("info", message, details);
}

export function logWarn(message: string, details?: LogDetails): void {
    log("warn", message, details);
}

export function logError(message: string, details?: LogDetails): void {
    log("error", message, details);
}

function log(level: "info" | "warn" | "error", message: string, details?: LogDetails): void {
    if (process.env.NODE_ENV === "test") {
        return;
    }

    const serializedDetails = details ? ` ${JSON.stringify(details)}` : "";
    console[level](`[${new Date().toISOString()}] ${message}${serializedDetails}`);
}
