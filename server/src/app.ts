import express, {type ErrorRequestHandler, type NextFunction, type Request, type Response} from "express";
import fs from "node:fs";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import {ValidateError} from "tsoa";
import {RegisterRoutes} from "./generated/routes";
import {logError, logInfo, logWarn} from "./logger";
import {DomainError} from "./services/DomainError";

const generatedOpenApiPath = path.resolve(__dirname, "generated/openapi.json");
const sourceOpenApiPath = path.resolve(__dirname, "../src/generated/openapi.json");
const clientDistPath = path.resolve(__dirname, "../../client/dist");

export function createApp() {
    const app = express();

    app.use(apiRequestLogger);
    app.use(express.json());

    app.get("/api/openapi.json", (_request: Request, response: Response) => {
        response.sendFile(getOpenApiPath());
    });

    app.use(
        "/api/docs",
        swaggerUi.serve,
        swaggerUi.setup(undefined, {
            swaggerOptions: {
                url: "/api/openapi.json"
            }
        })
    );

    RegisterRoutes(app);

    app.use(apiErrorHandler);

    app.use("/api", (_request: Request, response: Response) => {
        response.status(404).json({message: "API route not found."});
    });

    if (fs.existsSync(clientDistPath)) {
        app.use(express.static(clientDistPath));
        app.get("*", (_request: Request, response: Response) => {
            response.sendFile(path.join(clientDistPath, "index.html"));
        });
    } else {
        app.get("/", (_request: Request, response: Response) => {
            response.json({
                message: "Cohort management API is running. Build the client to serve the React app from this server."
            });
        });
    }

    return app;
}

function apiRequestLogger(request: Request, response: Response, next: NextFunction): void {
    if (!request.path.startsWith("/api")) {
        next();
        return;
    }

    const startedAt = Date.now();
    response.on("finish", () => {
        const details = {
            method: request.method,
            path: request.originalUrl,
            status: response.statusCode,
            duration_ms: Date.now() - startedAt
        };

        if (response.statusCode >= 500) {
            logError("api_request_failed", details);
            return;
        }

        if (response.statusCode >= 400) {
            logWarn("api_request_rejected", details);
            return;
        }

        logInfo("api_request_completed", details);
    });

    next();
}

const apiErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
    if (isMalformedJsonError(error)) {
        logWarn("api_error", {status: 400, type: "malformed_json"});
        response.status(400).json({
            message: "Malformed JSON request body."
        });
        return;
    }

    if (error instanceof ValidateError) {
        logWarn("api_error", {status: 422, type: "validation"});
        response.status(422).json({
            message: "Validation failed.",
            details: error.fields
        });
        return;
    }

    if (error instanceof DomainError) {
        const log = error.status >= 500 ? logError : logWarn;
        log("api_error", {status: error.status, type: "domain", message: error.message});
        response.status(error.status).json({
            message: error.message,
            details: error.details
        });
        return;
    }

    if (response.headersSent) {
        next(error);
        return;
    }

    logError("api_error", {
        status: 500,
        type: "unexpected",
        message: error instanceof Error ? error.message : "Unknown error"
    });
    response.status(500).json({
        message: "Unexpected server error."
    });
};

function isMalformedJsonError(error: unknown): error is SyntaxError & {status?: number; type?: string} {
    const jsonError = error as SyntaxError & {status?: number; type?: string};
    return error instanceof SyntaxError && "body" in error && jsonError.status === 400 && jsonError.type === "entity.parse.failed";
}

function getOpenApiPath(): string {
    if (fs.existsSync(generatedOpenApiPath)) {
        return generatedOpenApiPath;
    }

    return sourceOpenApiPath;
}
