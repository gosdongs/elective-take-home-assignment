export class DomainError extends Error {
    public readonly status: number;
    public readonly details?: unknown;

    public constructor(message: string, status = 400, details?: unknown) {
        super(message);
        this.name = "DomainError";
        this.status = status;
        this.details = details;
    }
}
