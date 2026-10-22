import request from "supertest";
import bcrypt from "bcryptjs";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
} from "./setup";
import { User, Shed, Batch, VaccinationTemplate, FeedStock } from "../models";
import { Express } from "express";
import { STANDARD_BROILER_VACCINATION_SCHEDULE } from "@broiler/shared";

describe("Batch Lifecycle & Pure Business Formulas Integration Tests", () => {
  let app: Express;
  let adminToken: string;
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
      status: "empty",
    });
    shed1Id = shed._id.toString();

    // Default Vaccination template
    await VaccinationTemplate.create({
      name: "Standard Broiler Schedule",
      isDefault: true,
      schedule: STANDARD_BROILER_VACCINATION_SCHEDULE,
    });

    // Default FeedStock
    await FeedStock.create({
      feedType: "starter",
      currentBags: 100,
      currentKg: 5000,
      bagWeightKg: 50,
    });

    // Admin user
    const adminPassHash = await bcrypt.hash("admin123", 10);
    await User.create({
      username: "admin",
      passwordHash: adminPassHash,
      name: "Farm Owner",
      phone: "03001234567",
      role: "admin",
      isActive: true,
    });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });
    adminToken = adminLogin.body.data.accessToken;
  });

  it("runs complete flock lifecycle from chick placement to closing with exact formula calculation", async () => {
    // 1. Admin creates a new batch of 5,000 chicks at Rs. 110/chick
    const createRes = await request(app)
      .post("/api/batches")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchNumber: "FLOCK-2026-A1",
        shedId: shed1Id,
        chicksPlaced: 5000,
        placementDate: "2026-03-01",
        expectedCloseDate: "2026-04-05",
        supplier: "Jadeed Chicks",
        breed: "Cobb 500",
        chickRate: 110,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const batchId = createRes.body.data._id;
    expect(createRes.body.data.initialCost).toBe(550000); // 5000 * 110

    // Verify shed is active
    const updatedShed = await Shed.findById(shed1Id);
    expect(updatedShed?.status).toBe("active");
    expect(updatedShed?.currentBatchId?.toString()).toBe(batchId);

    // 2. Reject placing another batch in the same active shed
    const dupRes = await request(app)
      .post("/api/batches")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchNumber: "FLOCK-2026-A2",
        shedId: shed1Id,
        chicksPlaced: 4000,
        placementDate: "2026-03-02",
        expectedCloseDate: "2026-04-06",
        supplier: "Jadeed Chicks",
        breed: "Cobb 500",
        chickRate: 110,
      });
    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error).toContain("already has an active flock");

    // 3. Add 3 daily records (Day 1, 2, 3)
    // Total feed: 6 bags (300kg) + 8 bags (400kg) + 10 bags (500kg) = 1200kg
    // Total mortality: 10 + 15 + 12 = 37 birds. Total culls: 2 + 1 + 2 = 5 birds
    await request(app)
      .post("/api/daily-records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchId,
        shedId: shed1Id,
        date: "2026-03-01",
        mortalityCount: 10,
        culls: 2,
        feedUsedBags: 6,
        feedType: "starter",
        waterLiters: 250,
        minTemp: 28,
        maxTemp: 33,
        litterCondition: "normal",
      });

    await request(app)
      .post("/api/daily-records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchId,
        shedId: shed1Id,
        date: "2026-03-02",
        mortalityCount: 15,
        culls: 1,
        feedUsedBags: 8,
        feedType: "starter",
        waterLiters: 300,
        minTemp: 27,
        maxTemp: 32,
        litterCondition: "normal",
      });

    await request(app)
      .post("/api/daily-records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchId,
        shedId: shed1Id,
        date: "2026-03-03",
        mortalityCount: 12,
        culls: 2,
        feedUsedBags: 10,
        feedType: "starter",
        waterLiters: 350,
        minTemp: 27,
        maxTemp: 32,
        litterCondition: "normal",
      });

    // 4. Record sample weight at Day 21
    const weightRes = await request(app)
      .post("/api/weights")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchId,
        shedId: shed1Id,
        date: "2026-03-21",
        ageInDays: 21,
        sampleSize: 50,
        averageWeightGrams: 1060, // Exact Day 21 target
      });
    expect(weightRes.status).toBe(201);
    expect(weightRes.body.data.performanceStatus).toBe("on_target");

    // 5. Add Feed Expense and Medicine Expense
    await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchId,
        category: "feed",
        amount: 850000,
        date: "2026-03-10",
        description: "Feed consignment",
        paymentMethod: "bank_transfer",
      });

    await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchId,
        category: "medicine",
        amount: 45000,
        date: "2026-03-12",
        description: "Vitamins & Liver tonic",
        paymentMethod: "cash",
      });

    // 6. Record Sales: 4,800 birds sold, 10,000 kg live weight @ Rs. 350/kg = Rs. 3,500,000
    const saleRes = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchId,
        shedId: shed1Id,
        buyerName: "Gujranwala Poultry Traders",
        date: "2026-04-05",
        birdsSold: 4800,
        totalLiveWeightKg: 10000,
        ratePerKg: 350,
        amountPaid: 2500000,
        paymentStatus: "partial",
      });

    expect(saleRes.status).toBe(201);
    expect(saleRes.body.data.totalAmount).toBe(3500000);
    expect(saleRes.body.data.balanceAmount).toBe(1000000);

    // 7. Close Batch
    const closeRes = await request(app)
      .post(`/api/batches/${batchId}/close`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        closedAt: "2026-04-05",
        finalMortalityAdjustment: 10,
        notes: "Flock harvested successfully",
      });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.success).toBe(true);

    const summary = closeRes.body.data.closeSummary;
    expect(summary).toBeDefined();
    expect(summary.birdsPlaced).toBe(5000);
    expect(summary.totalBirdsSold).toBe(4800);
    expect(summary.totalLiveWeightSoldKg).toBe(10000);
    expect(summary.totalSalesRevenue).toBe(3500000);

    // Total batch cost: initial chicks (550,000) + feed (850,000) + medicine (45,000) = 1,445,000
    expect(summary.totalBatchCost).toBe(1445000);
    // Net profit = 3,500,000 - 1,445,000 = 2,055,000
    expect(summary.netProfit).toBe(2055000);
    // Cost per kg sold = 1,445,000 / 10,000 = 144.50
    expect(summary.costPerKgSold).toBe(144.5);

    // Shed status must be set to 'cleaning'
    const cleaningShed = await Shed.findById(shed1Id);
    expect(cleaningShed?.status).toBe("cleaning");
    expect(cleaningShed?.currentBatchId).toBeNull();
  });
});
