import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import { ValidateError } from "tsoa";
import { RegisterRoutes } from "./generated/routes";
import { DomainError } from "./services/DomainError";

const generatedOpenApiPath = path.resolve(__dirname, "generated/openapi.json");
const sourceOpenApiPath = path.resolve(__dirname, "../src/generated/openapi.json");
const clientDistPath = path.resolve(__dirname, "../../client/dist");

export function createApp() {
  const app = express();

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
    response.status(404).json({ message: "API route not found." });
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

const apiErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (error instanceof ValidateError) {
    response.status(422).json({
      message: "Validation failed.",
      details: error.fields
    });
    return;
  }

  if (error instanceof DomainError) {
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

  response.status(500).json({
    message: "Unexpected server error."
  });
};

function getOpenApiPath(): string {
  if (fs.existsSync(generatedOpenApiPath)) {
    return generatedOpenApiPath;
  }

  return sourceOpenApiPath;
}
