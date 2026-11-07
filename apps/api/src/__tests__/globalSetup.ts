import { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalSetup() {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-key-32chars-for-testing";
  process.env.JWT_REFRESH_SECRET =
    "test-refresh-secret-key-32chars-for-testing";

  const mongoServer = await MongoMemoryServer.create({
    instance: {
      ip: "127.0.0.1",
    },
    binary: {
      version: "4.4.29",
    },
  });

  process.env.TEST_MONGODB_URI = mongoServer.getUri();
  (global as any).__MONGO_SERVER__ = mongoServer;
}
