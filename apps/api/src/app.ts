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

// Disable Mongoose command buffering in serverless to prevent 10000ms timeouts when Mongo is not running
mongoose.set("bufferCommands", false);

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

  // Support Vercel serverless rewrites: restore the original requested path
  app.use((req, _res, next) => {
    const originalPath = (req.headers["x-matched-path"] ||
                          req.headers["x-vercel-matched-path"] ||
                          req.headers["x-forwarded-uri"] ||
                          req.headers["x-original-url"] ||
                          req.headers["x-rewrite-url"]) as string;
    if (typeof originalPath === "string" && originalPath.length > 0 && !originalPath.endsWith("/index.ts") && !originalPath.endsWith("/api/index")) {
      const queryIdx = req.url.indexOf("?");
      if (queryIdx !== -1 && !originalPath.includes("?")) {
        req.url = originalPath + req.url.substring(queryIdx);
      } else {
        req.url = originalPath;
      }
    }
    next();
  });

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

  // Debug version endpoint
  app.get(["/debug-version", "/api/debug-version"], (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      version: "v2-neon-sheds-fixed",
      databaseUrlSet: !!config.databaseUrl,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routes (supports both /api/* and direct /* paths)
  app.use("/api", routes);
  app.use("/", routes);

  // Catch /index.ts and /api/index explicitly in case rewrite retained filename
  app.all(["/index.ts", "/api/index", "/api/index.ts"], (req: Request, res: Response, next) => {
    const originalPath = (req.headers["x-matched-path"] ||
                          req.headers["x-vercel-matched-path"] ||
                          req.headers["x-forwarded-uri"] ||
                          req.headers["x-original-url"] ||
                          req.headers["x-rewrite-url"]) as string;
    if (typeof originalPath === "string" && originalPath.length > 0 && !originalPath.includes("index")) {
      req.url = originalPath;
      return (app as any).handle(req, res, next);
    }
    return res.json({
      status: "ok",
      service: "Broiler Farm Management System API",
      timestamp: new Date().toISOString(),
      url: req.url,
      headers: req.headers,
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
