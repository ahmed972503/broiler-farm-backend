import request from "supertest";
import bcrypt from "bcryptjs";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
} from "./setup";
import { User, Shed } from "../models";
import { Express } from "express";

describe("Auth & User Management API Tests", () => {
  let app: Express;
  let adminToken: string;
  let workerToken: string;
  let shed1Id: string;

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    app = env.app;
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create Shed 1
    const shed = await Shed.create({
      name: "Shed 1",
      shedNumber: 1,
      capacity: 5000,
      status: "active",
    });
    shed1Id = shed._id.toString();

    // Create Admin user
    const adminPassHash = await bcrypt.hash("admin123", 10);
    const adminUser = await User.create({
      username: "admin",
      passwordHash: adminPassHash,
      name: "Farm Owner",
      phone: "03001234567",
      role: "admin",
      isActive: true,
    });

    // Create Worker user assigned to Shed 1
    const workerPassHash = await bcrypt.hash("worker123", 10);
    const workerUser = await User.create({
      username: "worker1",
      passwordHash: workerPassHash,
      name: "Bashir Ahmed",
      phone: "03111234567",
      role: "worker",
      assignedShedId: shed._id,
      isActive: true,
    });

    // Login Admin
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });
    adminToken = adminRes.body.data.accessToken;

    // Login Worker
    const workerRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "worker1", password: "worker123" });
    workerToken = workerRes.body.data.accessToken;
  });

  it("allows valid login and returns tokens with profile", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.username).toBe("admin");
    expect(res.body.data.user.role).toBe("admin");
  });

  it("rejects invalid password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("handles token refresh rotation correctly", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });

    const refreshToken = loginRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);
  });

  it("allows admin to create a new worker user", async () => {
    const res = await request(app)
      .post("/api/auth/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        username: "worker2",
        password: "password123",
        name: "Rashid Khan",
        phone: "03221234567",
        role: "worker",
        assignedShedId: shed1Id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe("worker2");
  });

  it("forbids worker from creating a user (403 Forbidden)", async () => {
    const res = await request(app)
      .post("/api/auth/users")
      .set("Authorization", `Bearer ${workerToken}`)
      .send({
        username: "worker3",
        password: "password123",
        name: "Unauthorized Worker",
        phone: "03331234567",
        role: "worker",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Admin access required");
  });

  it("allows admin to reset user password", async () => {
    const worker = await User.findOne({ username: "worker1" });

    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userId: worker!._id.toString(),
        newPassword: "newPassword123",
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Verify worker can login with new password
    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "worker1", password: "newPassword123" });

    expect(newLogin.status).toBe(200);
  });
});
