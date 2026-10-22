import mongoose from "mongoose";
import { createApp } from "./app";
import { config } from "./config";

async function bootstrap() {
  try {
    console.log("[Database] Connecting to MongoDB at", config.mongodbUri);
    await mongoose.connect(config.mongodbUri);
    console.log("[Database] Connected successfully to MongoDB");

    const app = createApp();

    app.listen(config.port, () => {
      console.log(
        `[Server] Broiler Farm API running in ${config.nodeEnv} mode on http://localhost:${config.port}`,
      );
      console.log(
        `[Server] Health check: http://localhost:${config.port}/health`,
      );
      console.log(`[Server] API Base URL: http://localhost:${config.port}/api`);
    });
  } catch (err) {
    console.error("[Bootstrap Error]: Failed to start server:", err);
    process.exit(1);
  }
}

bootstrap();
