import dotenv from "dotenv";
import path from "path";

// 1. Load local api .env
dotenv.config();

// 2. Load root .env.local (where Neon provisions DATABASE_URL)
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL ||
    "",
  jwtSecret:
    process.env.JWT_SECRET ||
    "fallback-super-secure-broiler-farm-secret-32chars",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    "fallback-super-secure-refresh-broiler-32chars",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
