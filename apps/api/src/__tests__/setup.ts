import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../app";
import { Express } from "express";

let mongoServer: MongoMemoryServer | null = null;
let appInstance: Express;

export async function setupTestEnvironment(): Promise<{ app: Express }> {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-key-32chars-for-testing";
  process.env.JWT_REFRESH_SECRET =
    "test-refresh-secret-key-32chars-for-testing";

  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        ip: "127.0.0.1",
      },
      binary: {
        version: "4.4.29",
      },
    });
    uri = mongoServer.getUri();
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  appInstance = createApp() as Express;
  return { app: appInstance };
}

export async function teardownTestEnvironment(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

export async function clearDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}
