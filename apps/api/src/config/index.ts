import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/broiler_farm",
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
