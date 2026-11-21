import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import routes from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { initNeonDatabase } from "./config/postgres";
import { config } from "./config";
import mongoose from "mongoose";

let isNeonInitialized = false;
let isMongoConnecting = false;

async function ensureDatabases() {
  if (!isNeonInitialized && config.databaseUrl) {
    try {
      await initNeonDatabase();
      isNeonInitialized = true;
    } catch (err) {
      console.error("[Neon Init Error]:", err);
    }
  }

  if (config.mongodbUri && mongoose.connection.readyState < 1 && !isMongoConnecting) {
    try {
      isMongoConnecting = true;
      await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 3000 });
    } catch (mErr: any) {
      console.warn("[Mongo Serverless]:", mErr.message);
    } finally {
      isMongoConnecting = false;
    }
  }
}

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(cors({ origin: "*", credentials: true }));

  // JSON Body Parser
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Request logger
  app.use(requestLogger);

  // Lazy database initialization for serverless invocations
  app.use(async (_req, _res, next) => {
    try {
      await ensureDatabases();
    } catch (e) {
      console.warn("[Lazy DB Init Error]:", e);
    }
    next();
  });

  // Rate Limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Too many requests, please try again later.",
    },
  });
  app.use("/api/", limiter);

  // Root endpoint
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "Broiler Farm Management System API",
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "Broiler Farm Management System API",
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routes
  app.use("/api", routes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
