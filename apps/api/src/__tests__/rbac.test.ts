import request from "supertest";
import bcrypt from "bcryptjs";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
} from "./setup";
import { User, Shed, Batch, DailyRecord } from "../models";
import { Express } from "express";

describe("RBAC & Shed Boundary Enforcement Tests", () => {
  let app: Express;
  let adminToken: string;
  let worker1Token: string;
  let shed1Id: string;
  let shed2Id: string;
  let batch1Id: string;
  let batch2Id: string;

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    app = env.app;
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create Shed 1 & Shed 2
    const shed1 = await Shed.create({
      name: "Shed 1",
      shedNumber: 1,
      capacity: 5000,
      status: "active",
    });
    const shed2 = await Shed.create({
      name: "Shed 2",
      shedNumber: 2,
      capacity: 5000,
      status: "active",
    });
    shed1Id = shed1._id.toString();
    shed2Id = shed2._id.toString();

    // Create Batch 1 in Shed 1
    const batch1 = await Batch.create({
      batchNumber: "FLOCK-S1-TEST",
      shedId: shed1._id,
      chicksPlaced: 5000,
      placementDate: "2026-03-01",
      expectedCloseDate: "2026-04-10",
      supplier: "National Hatchery",
      breed: "Cobb 500",
      chickRate: 110,
      initialCost: 550000,
      status: "active",
    });
    batch1Id = batch1._id.toString();
    shed1.currentBatchId = batch1._id as any;
    await shed1.save();

    // Create Batch 2 in Shed 2
    const batch2 = await Batch.create({
      batchNumber: "FLOCK-S2-TEST",
      shedId: shed2._id,
      chicksPlaced: 5000,
      placementDate: "2026-03-05",
      expectedCloseDate: "2026-04-15",
      supplier: "National Hatchery",
      breed: "Ross 308",
      chickRate: 110,
      initialCost: 550000,
      status: "active",
    });
    batch2Id = batch2._id.toString();
    shed2.currentBatchId = batch2._id as any;
    await shed2.save();

    // Admin user
    const adminPassHash = await bcrypt.hash("admin123", 10);
    await User.create({
      username: "admin",
      passwordHash: adminPassHash,
      name: "Owner Admin",
      phone: "03001111111",
      role: "admin",
      isActive: true,
    });

    // Worker 1 (assigned to Shed 1 ONLY)
    const workerPassHash = await bcrypt.hash("worker123", 10);
    await User.create({
      username: "worker1",
      passwordHash: workerPassHash,
      name: "Worker Shed 1",
      phone: "03002222222",
      role: "worker",
      assignedShedId: shed1._id,
      isActive: true,
    });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });
    adminToken = adminLogin.body.data.accessToken;

    const workerLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "worker1", password: "worker123" });
    worker1Token = workerLogin.body.data.accessToken;
  });

  it("strictly forbids worker from accessing financial endpoints (expenses)", async () => {
    const res = await request(app)
      .get("/api/expenses")
      .set("Authorization", `Bearer ${worker1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Admin access required");
  });

  it("strictly forbids worker from accessing sales endpoints", async () => {
    const res = await request(app)
      .get("/api/sales")
      .set("Authorization", `Bearer ${worker1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Admin access required");
  });

  it("strictly forbids worker from accessing the admin dashboard", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${worker1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Admin access required");
  });

  it("forbids worker from creating a daily record for another shed (Shed 2)", async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const res = await request(app)
      .post("/api/daily-records")
      .set("Authorization", `Bearer ${worker1Token}`)
      .send({
        batchId: batch2Id,
        shedId: shed2Id,
        date: todayStr,
        mortalityCount: 5,
        culls: 0,
        feedUsedBags: 6,
        feedType: "starter",
        waterLiters: 400,
        minTemp: 24,
        maxTemp: 30,
        litterCondition: "normal",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("assigned shed");
  });

  it("allows worker to create a daily record for their assigned shed (Shed 1)", async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const res = await request(app)
      .post("/api/daily-records")
      .set("Authorization", `Bearer ${worker1Token}`)
      .send({
        batchId: batch1Id,
        shedId: shed1Id,
        date: todayStr,
        mortalityCount: 3,
        culls: 1,
        feedUsedBags: 7,
        feedType: "starter",
        waterLiters: 450,
        minTemp: 23.5,
        maxTemp: 29.5,
        litterCondition: "normal",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.feedUsedKg).toBe(350); // 7 bags * 50kg = 350kg
  });

  it("locks past records and forbids worker from editing locked record", async () => {
    const record = await DailyRecord.create({
      batchId: batch1Id,
      shedId: shed1Id,
      date: "2026-03-02",
      ageInDays: 1,
      mortalityCount: 2,
      culls: 0,
      feedUsedBags: 5,
      feedUsedKg: 250,
      feedType: "starter",
      waterLiters: 300,
      minTemp: 24,
      maxTemp: 31,
      litterCondition: "normal",
      isLocked: true,
      createdBy: (await User.findOne({ username: "worker1" }))!._id,
    });

    const editRes = await request(app)
      .put(`/api/daily-records/${record._id}`)
      .set("Authorization", `Bearer ${worker1Token}`)
      .send({ mortalityCount: 4, shedId: shed1Id });

    expect(editRes.status).toBe(403);
    expect(editRes.body.error).toContain("locked");

    // Admin unlocks the record
    const unlockRes = await request(app)
      .post(`/api/daily-records/${record._id}/unlock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Worker made an honest counting error" });

    expect(unlockRes.status).toBe(200);

    // Worker can now edit the unlocked record
    const reEditRes = await request(app)
      .put(`/api/daily-records/${record._id}`)
      .set("Authorization", `Bearer ${worker1Token}`)
      .send({ mortalityCount: 4, shedId: shed1Id });

    expect(reEditRes.status).toBe(200);
    expect(reEditRes.body.data.mortalityCount).toBe(4);
  });
});
