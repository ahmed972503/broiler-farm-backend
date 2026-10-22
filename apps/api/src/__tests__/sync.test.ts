import request from "supertest";
import bcrypt from "bcryptjs";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
} from "./setup";
import { User, Shed, Batch, DailyRecord, Staff } from "../models";
import { Express } from "express";

describe("Offline-First Sync Engine Integration Tests", () => {
  let app: Express;
  let workerToken: string;
  let workerId: string;
  let shed1Id: string;
  let batch1Id: string;
  let staff1Id: string;

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    app = env.app;
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create Shed 1 & Batch 1
    const shed = await Shed.create({
      name: "Shed 1",
      shedNumber: 1,
      capacity: 5000,
      status: "active",
    });
    shed1Id = shed._id.toString();

    const batch = await Batch.create({
      batchNumber: "FLOCK-SYNC-TEST",
      shedId: shed._id,
      chicksPlaced: 5000,
      placementDate: "2026-03-01",
      expectedCloseDate: "2026-04-10",
      supplier: "National Hatchery",
      breed: "Cobb 500",
      chickRate: 110,
      initialCost: 550000,
      status: "active",
    });
    batch1Id = batch._id.toString();
    shed.currentBatchId = batch._id as any;
    await shed.save();

    // Create Staff
    const staff = await Staff.create({
      name: "Asghar Ali",
      phone: "03009999999",
      role: "worker",
      dailyWage: 1200,
      joiningDate: "2025-01-01",
    });
    staff1Id = staff._id.toString();

    // Create Worker User
    const workerPassHash = await bcrypt.hash("worker123", 10);
    const worker = await User.create({
      username: "worker1",
      passwordHash: workerPassHash,
      name: "Worker 1",
      phone: "03001234567",
      role: "worker",
      assignedShedId: shed._id,
      isActive: true,
    });
    workerId = worker._id.toString();

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "worker1", password: "worker123" });
    workerToken = loginRes.body.data.accessToken;
  });

  it("processes offline sync packet, persists mutations, and enforces idempotency", async () => {
    const clientMutationId1 = "c8d62638-3482-4f3a-9e12-b1b51db8f801";
    const clientMutationId2 = "c8d62638-3482-4f3a-9e12-b1b51db8f802";
    const clientTimestamp = new Date().toISOString();

    const syncPacket = {
      deviceId: "android-shed1-worker-tablet",
      userId: workerId,
      items: [
        {
          clientMutationId: clientMutationId1,
          entityType: "DAILY_RECORD",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date: "2026-03-10",
            ageInDays: 9,
            mortalityCount: 4,
            culls: 1,
            feedUsedBags: 7,
            feedType: "starter",
            waterLiters: 420,
            minTemp: 24,
            maxTemp: 31,
            litterCondition: "normal",
          },
          clientTimestamp,
        },
        {
          clientMutationId: clientMutationId2,
          entityType: "ATTENDANCE",
          action: "CREATE",
          payload: {
            staffId: staff1Id,
            date: "2026-03-10",
            status: "present",
            dailyWageAmount: 1200,
            advanceDeduction: 0,
          },
          clientTimestamp,
        },
      ],
    };

    // First Sync attempt
    const res = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(syncPacket);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.processedCount).toBe(2);
    expect(res.body.results[0].status).toBe("synced");
    expect(res.body.results[1].status).toBe("synced");

    // Verify record in database
    const savedDaily = await DailyRecord.findOne({
      batchId: batch1Id,
      date: "2026-03-10",
    });
    expect(savedDaily).not.toBeNull();
    expect(savedDaily?.mortalityCount).toBe(4);
    expect(savedDaily?.feedUsedKg).toBe(350); // 7 * 50

    // Second Sync attempt with exact same mutationIds (Idempotency test)
    const idempotentRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(syncPacket);

    expect(idempotentRes.status).toBe(200);
    expect(idempotentRes.body.results[0].message).toContain("idempotently");

    // Verify no duplicates created
    const dailyCount = await DailyRecord.countDocuments({
      batchId: batch1Id,
      date: "2026-03-10",
    });
    expect(dailyCount).toBe(1);
  });
});
