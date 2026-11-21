import express from "express";
import mongoose from "mongoose";
import app, { createApp } from "./app";
import { config } from "./config";
import { CronService } from "./services/cronService";
import { initNeonDatabase } from "./config/postgres";

async function bootstrap() {
  try {
    // 1. Initialize Neon PostgreSQL (Users Table & Authentication)
    if (config.databaseUrl) {
      console.log("[Neon Postgres] Connecting to Neon database...");
      await initNeonDatabase();
    }

    // 2. Connect to MongoDB if available
    try {
      console.log("[Database] Connecting to MongoDB at", config.mongodbUri);
      await mongoose.connect(config.mongodbUri);
      console.log("[Database] Connected successfully to MongoDB");
    } catch (mErr: any) {
      console.warn("[Database] MongoDB connection skipped/unavailable:", mErr.message);
    }

    // Start background scheduled jobs if not in serverless
    if (!process.env.VERCEL) {
      try {
        CronService.start();
        console.log("[Scheduler] Cron jobs initialized (hourly alert audit sweep)");
      } catch (cErr: any) {
        console.warn("[Scheduler] Cron init skipped:", cErr.message);
      }

      app.listen(config.port, () => {
        console.log(
          `[Server] Broiler Farm API running in ${config.nodeEnv} mode on http://localhost:${config.port}`,
        );
        console.log(
          `[Server] Health check: http://localhost:${config.port}/health`,
        );
        console.log(`[Server] API Base URL: http://localhost:${config.port}/api`);
      });
    }
  } catch (err) {
    console.error("[Bootstrap Error]: Failed to start server:", err);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

if (!process.env.VERCEL) {
  bootstrap();
}

export { createApp };
export default app;
