import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { Express } from 'express';

let mongoServer: MongoMemoryServer;
let appInstance: Express;

export async function setupTestEnvironment(): Promise<{ app: Express }> {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-32chars-for-testing';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32chars-for-testing';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);

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
  }
}

export async function clearDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}
