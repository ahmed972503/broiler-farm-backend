import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { config } from "../config";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
} from "./setup";
import {
  User,
  Shed,
  Batch,
  DailyRecord,
  Staff,
  VaccinationTask,
  WeightRecord,
  FeedStock,
  FeedTransfer,
  DailyMedicineSheet,
  Sale,
  Expense,
} from "../models";
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

  it("merges Day and Night shifts from two separate client packets without overwriting earlier shifts", async () => {
    const dayMutationId = "day-shift-mutation-" + Date.now();
    const nightMutationId = "night-shift-mutation-" + Date.now();
    const date = "2026-03-15";

    // 1. Worker A posts DAY shift entry
    const dayPacket = {
      deviceId: "tablet-day-shift",
      userId: workerId,
      items: [
        {
          clientMutationId: dayMutationId,
          entityType: "DAILY_RECORD",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date,
            ageInDays: 14,
            shift: "day",
            feedUsedDayShiftBags: 6,
            mortalityDayShift: 5,
            mortalityDayCause: "Heat stress",
            openingFeedStockBags: 50,
            feedReceivedBags: 10,
            customColumnES: 15,
            notes: "Morning shift normal",
          },
          clientTimestamp: "2026-03-15T12:00:00.000Z",
        },
      ],
    };

    const dayRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(dayPacket);

    expect(dayRes.status).toBe(200);
    expect(dayRes.body.results[0].status).toBe("synced");

    // 2. Worker B posts NIGHT shift entry from another device
    const nightPacket = {
      deviceId: "phone-night-shift",
      userId: workerId,
      items: [
        {
          clientMutationId: nightMutationId,
          entityType: "DAILY_RECORD",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date,
            ageInDays: 14,
            shift: "night",
            feedUsedNightShiftBags: 8,
            mortalityNightShift: 4,
            mortalityNightCause: "Respiratory gasping",
            closingFeedStockBags: 46, // 50 - 14 + 10 = 46 expected
            notes: "Night shift completed smoothly",
          },
          clientTimestamp: "2026-03-15T23:59:00.000Z",
        },
      ],
    };

    const nightRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(nightPacket);

    expect(nightRes.status).toBe(200);
    expect(nightRes.body.results[0].status).toBe("synced");

    // 3. Verify the merged record in MongoDB
    const record = await DailyRecord.findOne({ batchId: batch1Id, date });
    expect(record).not.toBeNull();
    // Day values preserved
    expect(record?.feedUsedDayShiftBags).toBe(6);
    expect(record?.mortalityDayShift).toBe(5);
    expect(record?.mortalityDayCause).toBe("Heat stress");
    expect(record?.customColumnES).toBe(15);
    // Night values merged
    expect(record?.feedUsedNightShiftBags).toBe(8);
    expect(record?.mortalityNightShift).toBe(4);
    expect(record?.mortalityNightCause).toBe("Respiratory gasping");
    // 24h Totals auto-calculated
    expect(record?.feedUsed24hBags).toBe(14);
    expect(record?.feedUsedKg).toBe(700); // 14 * 50
    expect(record?.mortality24h).toBe(9);
    // Stock reconciliation
    expect(record?.closingFeedStockBags).toBe(46);
    expect(record?.hasFeedStockShortage).toBe(false);
    expect(record?.shift).toBe("full");
  });

  it("handles partial failures gracefully without halting remaining items", async () => {
    const invalidBatchId = new mongoose.Types.ObjectId().toString();
    const packet = {
      deviceId: "device-mixed-packet",
      userId: workerId,
      items: [
        // Valid Item 1: Attendance
        {
          clientMutationId: "attendance-valid-" + Date.now(),
          entityType: "ATTENDANCE",
          action: "CREATE",
          payload: {
            staffId: staff1Id,
            date: "2026-03-16",
            status: "present",
            dailyWageAmount: 1200,
          },
          clientTimestamp: new Date().toISOString(),
        },
        // Invalid Item 2: DailyRecord with non-existent batchId
        {
          clientMutationId: "daily-record-invalid-" + Date.now(),
          entityType: "DAILY_RECORD",
          action: "CREATE",
          payload: {
            batchId: invalidBatchId,
            shedId: shed1Id,
            date: "2026-03-16",
            feedUsedBags: 5,
            mortalityCount: 2,
          },
          clientTimestamp: new Date().toISOString(),
        },
        // Valid Item 3: Expense
        {
          clientMutationId: "expense-valid-" + Date.now(),
          entityType: "EXPENSE",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            category: "misc",
            amount: 4500,
            date: "2026-03-16",
            description: "Rice husk bedding bags",
            paymentMethod: "cash",
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(packet);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.processedCount).toBe(3);

    // Item 1: synced
    expect(res.body.results[0].status).toBe("synced");
    expect(res.body.results[0].serverId).toBeDefined();

    // Item 2: error
    expect(res.body.results[1].status).toBe("error");
    expect(res.body.results[1].message).toContain("Associated batch not found");

    // Item 3: synced
    expect(res.body.results[2].status).toBe("synced");
    expect(res.body.results[2].serverId).toBeDefined();

    // Verify Expense was saved in DB
    const expense = await Expense.findById(res.body.results[2].serverId);
    expect(expense).not.toBeNull();
    expect(expense?.amount).toBe(4500);
  });

  it("rejects sync request with expired or missing token", async () => {
    // 1. Missing token
    const missingRes = await request(app)
      .post("/api/sync")
      .send({ deviceId: "d1", userId: workerId, items: [] });
    expect(missingRes.status).toBe(401);
    expect(missingRes.body.error).toContain("token missing");

    // 2. Expired token
    const expiredToken = jwt.sign(
      { userId: workerId, role: "worker" },
      config.jwtSecret,
      { expiresIn: "-10s" },
    );
    const expiredRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${expiredToken}`)
      .send({ deviceId: "d1", userId: workerId, items: [] });
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.code).toBe("TOKEN_EXPIRED");
  });

  it("syncs WEIGHT_RECORD create and update mutations", async () => {
    // Create Weight Record
    const createPacket = {
      deviceId: "scale-bluetooth-device",
      userId: workerId,
      items: [
        {
          clientMutationId: "weight-create-" + Date.now(),
          entityType: "WEIGHT_RECORD",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date: "2026-03-14",
            sampleSize: 50,
            averageWeightGrams: 850,
            sampleWeightsGrams: [840, 850, 860],
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const createRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(createPacket);

    expect(createRes.status).toBe(200);
    const serverWeightId = createRes.body.results[0].serverId;
    expect(serverWeightId).toBeDefined();

    // Update Weight Record
    const updatePacket = {
      deviceId: "scale-bluetooth-device",
      userId: workerId,
      items: [
        {
          clientMutationId: "weight-update-" + Date.now(),
          entityType: "WEIGHT_RECORD",
          action: "UPDATE",
          payload: {
            id: serverWeightId,
            batchId: batch1Id,
            shedId: shed1Id,
            date: "2026-03-14",
            sampleSize: 60,
            averageWeightGrams: 865,
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const updateRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(updatePacket);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.results[0].status).toBe("synced");

    const updatedWeight = await WeightRecord.findById(serverWeightId);
    expect(updatedWeight?.sampleSize).toBe(60);
    expect(updatedWeight?.averageWeightGrams).toBe(865);
  });

  it("syncs VACCINATION_TASK mutation and handles missing task", async () => {
    // 1. Create a task in DB
    const task = await VaccinationTask.create({
      batchId: batch1Id,
      shedId: shed1Id,
      vaccineName: "ND + IB Live",
      route: "eye_drop",
      ageInDays: 7,
      dueDate: "2026-03-08",
      status: "pending",
    });

    const syncPacket = {
      deviceId: "worker-tablet",
      userId: workerId,
      items: [
        {
          clientMutationId: "vax-complete-" + Date.now(),
          entityType: "VACCINATION_TASK",
          action: "UPDATE",
          payload: {
            taskId: task._id.toString(),
            status: "completed",
            notes: "Administered via eye drop to all 5,000 birds",
          },
          clientTimestamp: new Date().toISOString(),
        },
        {
          clientMutationId: "vax-nonexistent-" + Date.now(),
          entityType: "VACCINATION_TASK",
          action: "UPDATE",
          payload: {
            taskId: new mongoose.Types.ObjectId().toString(),
            status: "completed",
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(syncPacket);

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("synced");
    expect(res.body.results[1].status).toBe("error");
    expect(res.body.results[1].message).toContain("Vaccination task not found");

    const refreshedTask = await VaccinationTask.findById(task._id);
    expect(refreshedTask?.status).toBe("completed");
    expect(refreshedTask?.notes).toContain("eye drop");
  });

  it("syncs DAILY_MEDICINE sheets and updates existing sheet", async () => {
    const date = "2026-03-12";
    const initialSheetPacket = {
      deviceId: "device-med-1",
      userId: workerId,
      items: [
        {
          clientMutationId: "med-sheet-init-" + Date.now(),
          entityType: "DAILY_MEDICINE",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date,
            items: [
              {
                name: "Electrolytes + Vit C",
                type: "water_medication",
                timeOfAdministration: "morning",
                waterQuantityLiters: 200,
              },
            ],
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const res1 = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(initialSheetPacket);

    expect(res1.status).toBe(200);
    expect(res1.body.results[0].status).toBe("synced");

    // Second packet adding an evening antibiotic to the same sheet
    const updatedSheetPacket = {
      deviceId: "device-med-1",
      userId: workerId,
      items: [
        {
          clientMutationId: "med-sheet-update-" + Date.now(),
          entityType: "DAILY_MEDICINE",
          action: "UPDATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date,
            items: [
              {
                name: "Electrolytes + Vit C",
                type: "water_medication",
                timeOfAdministration: "morning",
              },
              {
                name: "Colistin Sulphate",
                type: "water_medication",
                timeOfAdministration: "evening",
                purpose: "Enteritis prevention",
              },
            ],
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const res2 = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(updatedSheetPacket);

    expect(res2.status).toBe(200);
    expect(res2.body.results[0].status).toBe("synced");

    const savedSheet = await DailyMedicineSheet.findOne({
      batchId: batch1Id,
      date,
    });
    expect(savedSheet?.items.length).toBe(2);
    expect(savedSheet?.items[1].name).toBe("Colistin Sulphate");
  });

  it("syncs FEED_ISSUE and deducts from FeedStock", async () => {
    // Setup initial feed stock
    await FeedStock.deleteMany({});
    await FeedStock.create({
      feedType: "grower",
      currentBags: 100,
      currentKg: 5000,
      bagWeightKg: 50,
      lastUpdated: new Date(),
    });

    const feedIssuePacket = {
      deviceId: "warehouse-tablet",
      userId: workerId,
      items: [
        {
          clientMutationId: "feed-issue-" + Date.now(),
          entityType: "FEED_ISSUE",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            feedType: "grower",
            bags: 12,
            bagWeightKg: 50,
            date: "2026-03-18",
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(feedIssuePacket);

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("synced");

    const stock = await FeedStock.findOne({ feedType: "grower" });
    expect(stock?.currentBags).toBe(88); // 100 - 12
    expect(stock?.currentKg).toBe(4400); // 5000 - 600
  });

  it("syncs FEED_TRANSFER (transfer_in and transfer_out) and updates FeedStock accordingly", async () => {
    await FeedStock.deleteMany({});
    await FeedStock.create({
      feedType: "starter",
      currentBags: 50,
      currentKg: 2500,
      bagWeightKg: 50,
      lastUpdated: new Date(),
    });

    const transferPacket = {
      deviceId: "admin-phone",
      userId: workerId,
      items: [
        // 1. Transfer In: borrowed 20 bags from Tariq Farm
        {
          clientMutationId: "feed-tx-in-" + Date.now(),
          entityType: "FEED_TRANSFER",
          action: "CREATE",
          payload: {
            date: "2026-03-19",
            partyName: "Tariq Poultry Farm",
            type: "transfer_in",
            feedBrand: "Star Feed",
            feedType: "starter",
            bags: 20,
            bagWeightKg: 50,
            status: "pending_return",
          },
          clientTimestamp: new Date().toISOString(),
        },
        // 2. Transfer Out: lent 5 bags to Bilal Farm
        {
          clientMutationId: "feed-tx-out-" + Date.now(),
          entityType: "FEED_TRANSFER",
          action: "CREATE",
          payload: {
            date: "2026-03-20",
            partyName: "Bilal Poultry Farm",
            type: "transfer_out",
            feedBrand: "Star Feed",
            feedType: "starter",
            bags: 5,
            bagWeightKg: 50,
            status: "pending_return",
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(transferPacket);

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("synced");
    expect(res.body.results[1].status).toBe("synced");

    // Verify FeedStock: 50 + 20 - 5 = 65 bags
    const stock = await FeedStock.findOne({ feedType: "starter" });
    expect(stock?.currentBags).toBe(65);
    expect(stock?.currentKg).toBe(3250);
  });

  it("syncs SALE mutations with lifting auto-calculated birds and manual override", async () => {
    const salePacket = {
      deviceId: "admin-tablet",
      userId: workerId,
      items: [
        // 1. Auto-calculated birds: 3475 kg @ 2.25 kg -> 1544 birds
        {
          clientMutationId: "sale-lifting-auto-" + Date.now(),
          entityType: "SALE",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            lotNumber: 1,
            buyerName: "Haji Aslam Chicken Dealer",
            saleDate: "2026-04-05",
            totalLiveWeightKg: 3475,
            averageWeightKg: 2.25,
            ratePerKg: 380,
            amountPaid: 1000000,
            paymentStatus: "partial",
          },
          clientTimestamp: new Date().toISOString(),
        },
        // 2. Manual override: 3111 kg @ 2.56 kg -> calculated 1215, overridden to 1220 with reason
        {
          clientMutationId: "sale-lifting-override-" + Date.now(),
          entityType: "SALE",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            lotNumber: 2,
            buyerName: "Haji Aslam Chicken Dealer",
            saleDate: "2026-04-06",
            totalLiveWeightKg: 3111,
            averageWeightKg: 2.56,
            birdsSold: 1220,
            isManualBirdCountOverride: true,
            overrideReason:
              "Coop head count verified by weighbridge supervisor",
            ratePerKg: 385,
            amountPaid: 1197735,
            paymentStatus: "paid",
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(salePacket);

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("synced");
    expect(res.body.results[1].status).toBe("synced");

    const sale1 = await Sale.findById(res.body.results[0].serverId);
    expect(sale1?.birdsSold).toBe(1544); // 3475 / 2.25 = 1544.44 -> 1544
    expect(sale1?.isManualBirdCountOverride).toBe(false);

    const sale2 = await Sale.findById(res.body.results[1].serverId);
    expect(sale2?.birdsSold).toBe(1220);
    expect(sale2?.isManualBirdCountOverride).toBe(true);
    expect(sale2?.overrideReason).toContain("weighbridge supervisor");
  });

  it("handles unsupported entity types cleanly", async () => {
    const invalidPacket = {
      deviceId: "device-bad-entity",
      userId: workerId,
      items: [
        {
          clientMutationId: "bad-entity-" + Date.now(),
          entityType: "UNKNOWN_ENTITY" as any,
          action: "CREATE",
          payload: {},
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(invalidPacket);

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("error");
    expect(res.body.results[0].message).toContain(
      "Unsupported entity type: UNKNOWN_ENTITY",
    );
  });

  it("covers MEDICINE_RECORD entity type and edge shift branching", async () => {
    // 1. MEDICINE_RECORD sync
    const medPacket = {
      deviceId: "device-med-rec",
      userId: workerId,
      items: [
        {
          clientMutationId: "med-rec-" + Date.now(),
          entityType: "MEDICINE_RECORD",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date: "2026-03-22",
            medicineName: "Enrofloxacin 10%",
            dosage: "1ml per 2L water",
            purpose: "preventive",
            administeredBy: workerId,
            totalCost: 1500,
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const medRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(medPacket);

    expect(medRes.status).toBe(200);
    expect(medRes.body.results[0].status).toBe("synced");

    // 2. Initial record created directly with shift="night"
    const nightOnlyPacket = {
      deviceId: "device-night-only",
      userId: workerId,
      items: [
        {
          clientMutationId: "night-only-" + Date.now(),
          entityType: "DAILY_RECORD",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date: "2026-03-23",
            ageInDays: 22,
            feedType: "starter",
            shift: "night",
            feedUsedBags: 6,
            mortalityCount: 3,
            waterLiters: 300,
            minTemp: 22,
            maxTemp: 28,
            litterCondition: "normal",
            notes: "Only night entry recorded first",
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const nightRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(nightOnlyPacket);

    expect(nightRes.status).toBe(200);
    expect(nightRes.body.results[0].status).toBe("synced");

    const recordNight = await DailyRecord.findOne({
      batchId: batch1Id,
      date: "2026-03-23",
    });
    expect(recordNight?.feedUsedNightShiftBags).toBe(6);
    expect(recordNight?.mortalityNightShift).toBe(3);

    // 3. Merging day shift with shift="day" and feedUsedBags/mortalityCount
    const dayMergePacket = {
      deviceId: "device-day-merge",
      userId: workerId,
      items: [
        {
          clientMutationId: "day-merge-" + Date.now(),
          entityType: "DAILY_RECORD",
          action: "UPDATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            date: "2026-03-23",
            ageInDays: 22,
            feedType: "starter",
            shift: "day",
            feedUsedBags: 5,
            mortalityCount: 2,
            waterLiters: 350,
            notes: "Merged morning shift",
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const dayRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(dayMergePacket);

    expect(dayRes.status).toBe(200);
    expect(dayRes.body.results[0].status).toBe("synced");

    const recordMerged = await DailyRecord.findOne({
      batchId: batch1Id,
      date: "2026-03-23",
    });
    expect(recordMerged?.feedUsedDayShiftBags).toBe(5);
    expect(recordMerged?.feedUsedNightShiftBags).toBe(6);
    expect(recordMerged?.mortalityDayShift).toBe(2);
    expect(recordMerged?.mortalityNightShift).toBe(3);

    // 4. Vaccination task with default completedAt and default notes
    const vaxTask = await VaccinationTask.create({
      batchId: batch1Id,
      shedId: shed1Id,
      vaccineName: "Gumboro IBD",
      route: "drinking_water",
      ageInDays: 14,
      dueDate: "2026-03-15",
      status: "pending",
    });

    const vaxDefPacket = {
      deviceId: "device-vax-def",
      userId: workerId,
      items: [
        {
          clientMutationId: "vax-def-" + Date.now(),
          entityType: "VACCINATION_TASK",
          action: "UPDATE",
          payload: {
            taskId: vaxTask._id.toString(),
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const vaxDefRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(vaxDefPacket);

    expect(vaxDefRes.status).toBe(200);
    expect(vaxDefRes.body.results[0].status).toBe("synced");

    // 5. Sale with derived average weight
    const saleDerivedPacket = {
      deviceId: "device-sale-derived",
      userId: workerId,
      items: [
        {
          clientMutationId: "sale-derived-" + Date.now(),
          entityType: "SALE",
          action: "CREATE",
          payload: {
            batchId: batch1Id,
            shedId: shed1Id,
            buyerName: "City Poultry Traders",
            date: "2026-04-08",
            totalLiveWeightKg: 4000,
            birdsSold: 2000, // 4000 / 2000 = 2.0 kg avg derived
            ratePerKg: 390,
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const saleDerivedRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(saleDerivedPacket);

    expect(saleDerivedRes.status).toBe(200);
    expect(saleDerivedRes.body.results[0].status).toBe("synced");

    // 6. Attendance update for existing record
    const attUpdatePacket = {
      deviceId: "device-att-update",
      userId: workerId,
      items: [
        {
          clientMutationId: "att-update-" + Date.now(),
          entityType: "ATTENDANCE",
          action: "UPDATE",
          payload: {
            staffId: staff1Id,
            date: "2026-03-10",
            status: "half_day",
            dailyWageAmount: 600,
          },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    };

    const attUpdateRes = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${workerToken}`)
      .send(attUpdatePacket);

    expect(attUpdateRes.status).toBe(200);
    expect(attUpdateRes.body.results[0].status).toBe("synced");
  });
});
