import request from "supertest";
import bcrypt from "bcryptjs";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
} from "./setup";
import { User, Shed, Batch, FarmSettings } from "../models";
import { Express } from "express";

describe("Comprehensive End-to-End API Integration & RBAC Tests", () => {
  let app: Express;
  let adminToken: string;
  let workerToken: string;
  let shed1Id: string;
  let shed2Id: string;
  let batch1Id: string;
  let cachedAdminHash: string;
  let cachedWorkerHash: string;

  beforeAll(async () => {
    jest.setTimeout(120000);
    const env = await setupTestEnvironment();
    app = env.app;
    cachedAdminHash = await bcrypt.hash("admin123", 4);
    cachedWorkerHash = await bcrypt.hash("worker123", 4);
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Seed default farm settings
    await FarmSettings.create({
      farmName: "Al-Madina Broiler Farm",
      alertThresholds: {
        mortalitySpikePercentDaily: 0.8,
        lowFeedStockBags: 20,
        tempMinCelsius: 20.0,
        tempMaxCelsius: 34.0,
        medicineExpiryWarningDays: 30,
        paymentOverdueDays: 14,
      },
    });

    // Create Shed 1 & 2
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
      status: "empty",
    });
    shed1Id = shed1._id.toString();
    shed2Id = shed2._id.toString();

    // Create Batch in Shed 1
    const batch1 = await Batch.create({
      batchNumber: "FLOCK-001",
      shedId: shed1._id,
      chicksPlaced: 5000,
      placementDate: "2026-03-01",
      expectedCloseDate: "2026-04-12",
      supplier: "National Hatchery",
      breed: "Cobb 500",
      chickRate: 110,
      initialCost: 550000,
      status: "active",
    });
    batch1Id = batch1._id.toString();
    shed1.currentBatchId = batch1._id as any;
    await shed1.save();

    // Create Admin user
    await User.create({
      username: "admin",
      passwordHash: cachedAdminHash,
      name: "Owner Admin",
      phone: "03001111111",
      role: "admin",
      isActive: true,
    });

    // Create Worker assigned to Shed 1 ONLY
    await User.create({
      username: "worker1",
      passwordHash: cachedWorkerHash,
      name: "Bashir Worker",
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
    workerToken = workerLogin.body.data.accessToken;
  });

  // 1. Sheds Endpoints
  describe("Sheds Module", () => {
    it("GET /api/sheds returns list of sheds", async () => {
      const res = await request(app)
        .get("/api/sheds")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it("GET /api/sheds/:id returns specific shed", async () => {
      const res = await request(app)
        .get(`/api/sheds/${shed1Id}`)
        .set("Authorization", `Bearer ${workerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Shed 1");
    });
  });

  // 2. Batches Endpoints
  describe("Batches Module", () => {
    it("POST /api/batches creates new batch (Admin only)", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          batchNumber: "FLOCK-002",
          shedId: shed2Id,
          chicksPlaced: 4000,
          placementDate: "2026-03-10",
          expectedCloseDate: "2026-04-20",
          supplier: "Supreme Hatchery",
          breed: "Ross 308",
          chickRate: 115,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.batchNumber).toBe("FLOCK-002");
    });

    it("GET /api/batches lists all flocks", async () => {
      const res = await request(app)
        .get("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 3. Daily Records Endpoints & RBAC
  describe("Daily Records Module", () => {
    it("POST /api/daily-records creates daily entry for assigned shed", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/daily-records")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          batchId: batch1Id,
          shedId: shed1Id,
          date: today,
          mortalityCount: 4,
          culls: 1,
          feedUsedBags: 8,
          feedType: "starter",
          waterLiters: 450,
          minTemp: 24.0,
          maxTemp: 31.0,
          litterCondition: "normal",
        });
      expect(res.status).toBe(201);
      expect(res.body.data.mortalityCount).toBe(4);
    });

    it("POST /api/daily-records rejects worker accessing different shed (403 Forbidden)", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/daily-records")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          batchId: batch1Id,
          shedId: shed2Id,
          date: today,
          mortalityCount: 2,
          culls: 0,
          feedUsedBags: 5,
          feedType: "starter",
          waterLiters: 400,
          minTemp: 24.0,
          maxTemp: 30.0,
          litterCondition: "normal",
        });
      expect(res.status).toBe(403);
    });
  });

  // 4. Weight Tracking Endpoints
  describe("Weight Tracking Module", () => {
    it("POST /api/weights logs weekly sample weighing", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/weights")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          batchId: batch1Id,
          shedId: shed1Id,
          date: today,
          ageInDays: 7,
          sampleSize: 50,
          averageWeightGrams: 190,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.averageWeightGrams).toBe(190);
    });

    it("GET /api/weights returns weight records for batch", async () => {
      const res = await request(app)
        .get(`/api/weights?batchId=${batch1Id}`)
        .set("Authorization", `Bearer ${workerToken}`);
      expect(res.status).toBe(200);
    });
  });

  // 5. Vaccination Endpoints
  describe("Vaccinations Module", () => {
    it("GET /api/vaccinations/tasks returns scheduled vaccination tasks", async () => {
      const res = await request(app)
        .get(`/api/vaccinations/tasks?batchId=${batch1Id}`)
        .set("Authorization", `Bearer ${workerToken}`);
      expect(res.status).toBe(200);
    });

    it("GET /api/vaccinations/templates returns templates (Admin)", async () => {
      const res = await request(app)
        .get("/api/vaccinations/templates")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // 6. Feed Inventory Endpoints
  describe("Feed Inventory Module", () => {
    it("POST /api/feed/purchases logs bulk feed delivery (Admin)", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/feed/purchases")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          supplier: "Supreme Feeds",
          date: today,
          feedType: "starter",
          bags: 100,
          bagWeightKg: 50,
          ratePerBag: 4200,
          invoiceNo: "INV-1001",
        });
      expect(res.status).toBe(201);
      expect(res.body.data.ratePerBag).toBe(4200);
    });

    it("POST /api/feed/issues issues feed to a shed", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/feed/issues")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          date: today,
          batchId: batch1Id,
          shedId: shed1Id,
          feedType: "starter",
          bags: 10,
          bagWeightKg: 50,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.totalKg).toBe(500);
    });

    it("GET /api/feed/stock returns current feed warehouse stock", async () => {
      const res = await request(app)
        .get("/api/feed/stock")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // 7. Consumables & General Inventory Endpoints
  describe("Inventory Module", () => {
    it("POST /api/inventory adds new medicine / item", async () => {
      const res = await request(app)
        .post("/api/inventory")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Tylosin Tartrate 100g",
          category: "medicine",
          quantity: 20,
          unit: "bottles",
          expiryDate: "2027-01-01",
          reorderLevel: 5,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Tylosin Tartrate 100g");
    });

    it("GET /api/inventory lists farm inventory", async () => {
      // Create item first
      await request(app)
        .post("/api/inventory")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Pan feeder spare cones",
          category: "equipment",
          quantity: 15,
          unit: "pcs",
        });

      const res = await request(app)
        .get("/api/inventory")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 8. Financial Expenses Endpoints & RBAC
  describe("Expenses Module", () => {
    it("POST /api/expenses logs categorized expense", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          date: today,
          category: "electricity",
          amount: 45000,
          description: "Monthly WAPDA bill for Shed 1 ventilation",
          batchId: batch1Id,
          paymentMethod: "bank_transfer",
        });
      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(45000);
    });

    it("Worker is strictly forbidden from accessing expenses (403)", async () => {
      const res = await request(app)
        .get("/api/expenses")
        .set("Authorization", `Bearer ${workerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // 9. Sales, Buyers & RBAC
  describe("Sales & Buyers Module", () => {
    it("POST /api/sales records bird sale with manually editable rate", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/sales")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          date: today,
          batchId: batch1Id,
          shedId: shed1Id,
          buyerName: "Haji Aslam Chicken Trader",
          buyerPhone: "03009999999",
          birdsSold: 1500,
          totalLiveWeightKg: 3300,
          ratePerKg: 385,
          amountPaid: 1000000,
          paymentStatus: "partial",
          vehicleNo: "LEA-5522",
        });
      expect(res.status).toBe(201);
      expect(res.body.data.totalAmount).toBe(1270500); // 3300kg * 385 = 1,270,500
    });

    it("GET /api/sales/ledger/:buyerName returns buyer ledger history", async () => {
      const res = await request(app)
        .get("/api/sales/ledger/Haji%20Aslam%20Chicken%20Trader")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it("Worker is forbidden from accessing sales (403)", async () => {
      const res = await request(app)
        .get("/api/sales")
        .set("Authorization", `Bearer ${workerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // 10. Staff & Payroll Endpoints
  describe("Staff & Payroll Module", () => {
    let staffId: string;

    it("POST /api/staff registers new worker", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/staff")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Muhammad Rafiq",
          role: "worker",
          phone: "03451112233",
          dailyWage: 1200,
          assignedShedId: shed1Id,
          joiningDate: today,
        });
      expect(res.status).toBe(201);
      staffId = res.body.data._id;
    });

    it("POST /api/staff/attendance logs daily attendance", async () => {
      const today = new Date().toISOString().split("T")[0];
      // Create staff first
      const staffRes = await request(app)
        .post("/api/staff")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Attendance Test Staff",
          role: "worker",
          phone: "03451112244",
          dailyWage: 1200,
          joiningDate: today,
        });

      const res = await request(app)
        .post("/api/staff/attendance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          staffId: staffRes.body.data._id,
          date: today,
          status: "present",
        });
      expect([200, 201]).toContain(res.status);
    });

    it("POST /api/staff/advances logs advance payment", async () => {
      const today = new Date().toISOString().split("T")[0];
      const staffRes = await request(app)
        .post("/api/staff")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Advance Test Staff",
          role: "worker",
          phone: "03451112255",
          dailyWage: 1200,
          joiningDate: today,
        });

      const res = await request(app)
        .post("/api/staff/advances")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          staffId: staffRes.body.data._id,
          date: today,
          amount: 5000,
          reason: "Family medical expense",
        });
      expect(res.status).toBe(201);
    });

    it("GET /api/staff/wages calculates monthly payroll report", async () => {
      const res = await request(app)
        .get("/api/staff/wages?month=2026-03")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // 11. Alerts Engine Endpoints
  describe("Alerts Engine Module", () => {
    it("POST /api/alerts/sweep runs audit sweep and flags missed entries", async () => {
      const res = await request(app)
        .post("/api/alerts/sweep")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api/alerts retrieves unresolved alerts", async () => {
      const res = await request(app)
        .get("/api/alerts")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // 12. Reports Endpoints
  describe("Reports Module", () => {
    it("GET /api/reports/batch/:id exports complete batch performance summary", async () => {
      const res = await request(app)
        .get(`/api/reports/batch/${batch1Id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.batch.batchNumber).toBe("FLOCK-001");
    });

    it("GET /api/reports/sheds exports shed-wise comparison", async () => {
      const res = await request(app)
        .get("/api/reports/sheds")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // 13. Settings Endpoints & Configurable Thresholds
  describe("Settings Module", () => {
    it("PUT /api/settings updates configurable mortality spike threshold", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          alertThresholds: {
            mortalitySpikePercentDaily: 1.5,
            lowFeedStockBags: 30,
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.data.alertThresholds.mortalitySpikePercentDaily).toBe(
        1.5,
      );
    });
  });

  // 14. Offline Sync Endpoint & Duplicate Prevention
  describe("Sync Module", () => {
    it("POST /api/sync processes client mutation queue with idempotency", async () => {
      const clientMutationId = "123e4567-e89b-12d3-a456-426614174000";
      const today = new Date().toISOString().split("T")[0];

      const packet = {
        deviceId: "device-test-001",
        userId: (await User.findOne({ username: "worker1" }))!._id.toString(),
        items: [
          {
            clientMutationId,
            entityType: "DAILY_RECORD",
            action: "CREATE",
            payload: {
              batchId: batch1Id,
              shedId: shed1Id,
              date: today,
              ageInDays: 5,
              mortalityCount: 2,
              culls: 0,
              feedUsedBags: 6,
              feedUsedKg: 300,
              feedType: "starter",
              waterLiters: 400,
              minTemp: 24.0,
              maxTemp: 31.0,
              litterCondition: "normal",
            },
            clientTimestamp: new Date().toISOString(),
          },
        ],
      };

      // First sync
      const res1 = await request(app)
        .post("/api/sync")
        .set("Authorization", `Bearer ${workerToken}`)
        .send(packet);
      expect(res1.status).toBe(200);
      expect(res1.body.processedCount).toBe(1);

      // Duplicate sync with same mutation ID (idempotency test)
      const res2 = await request(app)
        .post("/api/sync")
        .set("Authorization", `Bearer ${workerToken}`)
        .send(packet);
      expect(res2.status).toBe(200);
      expect(res2.body.processedCount).toBe(1);
      expect(["synced", "duplicate"]).toContain(res2.body.results[0].status);
    });
  });
});
