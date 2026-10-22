import mongoose from "mongoose";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
} from "./setup";
import { ReportService } from "../services/reportService";
import { SyncService } from "../services/syncService";
import {
  Shed,
  Batch,
  DailyRecord,
  WeightRecord,
  Sale,
  Expense,
  FeedPurchase,
  FeedIssue,
  Staff,
  Attendance,
  StaffAdvance,
  User,
} from "../models";
import {
  calculateBirdsRemaining,
  calculateFCR,
  calculateEPEF,
  calculateStaffWage,
  SyncPacketInput,
} from "@broiler/shared";

describe("Services & Business Logic Comprehensive Test Suite", () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe("ReportService Pure Helpers & CSV Formatting", () => {
    it("returns empty string for empty array", () => {
      expect(ReportService.convertToCSV([])).toBe("");
    });

    it("converts array of objects to valid CSV format with escaping", () => {
      const data = [
        { shed: "Shed 1", birdsRemaining: 4950, notes: 'Normal "all good"' },
        { shed: "Shed 2", birdsRemaining: 4890, notes: "Cool" },
      ];

      const csv = ReportService.convertToCSV(data);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("shed,birdsRemaining,notes");
      expect(lines[1]).toContain('"Shed 1","4950","Normal ""all good"""');
      expect(lines[2]).toContain('"Shed 2","4890","Cool"');
    });
  });

  describe("Flock Production Formulas Verification", () => {
    it("accurately reconciles bird counts during flock life cycle", () => {
      const remaining = calculateBirdsRemaining(5000, 120, 30, 2000);
      expect(remaining).toBe(2850);
    });

    it("calculates FCR correctly", () => {
      const fcr = calculateFCR(15000, 9800);
      expect(fcr).toBe(1.531);
    });

    it("calculates EPEF (European Production Efficiency Factor)", () => {
      const epef = calculateEPEF(97.5, 2.15, 35, 1.55);
      expect(epef).toBe(386.4);
    });

    it("calculates staff wages with attendance and advance deductions", () => {
      const wage = calculateStaffWage(1200, 25, 2, 5000);
      expect(wage.grossWage).toBe(31200);
      expect(wage.advanceDeductions).toBe(5000);
      expect(wage.netPayable).toBe(26200);
    });
  });

  describe("ReportService Database Reports", () => {
    let shedId: mongoose.Types.ObjectId;
    let batchId: mongoose.Types.ObjectId;
    let userId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const user = await User.create({
        username: "admin_report",
        passwordHash: "dummyhash",
        name: "Farm Manager",
        phone: "+923001111111",
        role: "admin",
      });
      userId = user._id;

      const shed = await Shed.create({
        name: "North Shed 1",
        shedNumber: 1,
        capacity: 5000,
        status: "active",
      });
      shedId = shed._id;

      const batch = await Batch.create({
        batchNumber: "B-2026-01",
        shedId,
        placementDate: "2026-01-01",
        expectedCloseDate: "2026-02-15",
        supplier: "Punjab Hatchery",
        chicksPlaced: 5000,
        breed: "Cobb 500",
        chickRate: 95,
        initialCost: 475000,
        status: "active",
      });
      batchId = batch._id;

      await DailyRecord.create([
        {
          batchId,
          shedId,
          date: "2026-01-01",
          ageInDays: 1,
          mortalityCount: 5,
          culls: 1,
          feedUsedKg: 200,
          feedUsedBags: 4,
          feedType: "starter",
          waterLiters: 400,
          minTemp: 32,
          maxTemp: 34,
          createdBy: userId,
        },
        {
          batchId,
          shedId,
          date: "2026-01-02",
          ageInDays: 2,
          mortalityCount: 3,
          culls: 0,
          feedUsedKg: 220,
          feedUsedBags: 4.4,
          feedType: "starter",
          waterLiters: 450,
          minTemp: 31,
          maxTemp: 33,
          createdBy: userId,
        },
      ]);

      await WeightRecord.create({
        batchId,
        shedId,
        date: "2026-01-07",
        ageInDays: 7,
        sampleSize: 50,
        averageWeightGrams: 195,
        targetWeightGrams: 190,
        deviationGrams: 5,
        createdBy: userId,
      });

      await Expense.create({
        batchId,
        date: "2026-01-02",
        category: "feed",
        amount: 35000,
        description: "Initial feed purchase",
        createdBy: userId,
      });

      await Sale.create({
        batchId,
        shedId,
        date: "2026-01-35",
        buyerName: "Lahore Poultry Traders",
        buyerPhone: "+923009999999",
        birdsSold: 2000,
        totalLiveWeightKg: 4200,
        averageWeightKg: 2.1,
        ratePerKg: 380,
        totalAmount: 1596000,
        amountPaid: 1000000,
        balanceAmount: 596000,
        paymentStatus: "partial",
        createdBy: userId,
      });
    });

    it("generates comprehensive batch report with financial metrics", async () => {
      const report = await ReportService.getBatchReport(batchId.toString());

      expect(report.batch.batchNumber).toBe("B-2026-01");
      expect(report.batch.chicksPlaced).toBe(5000);
      expect(report.metrics.totalMortality).toBe(8);
      expect(report.metrics.totalCulls).toBe(1);
      expect(report.metrics.totalFeedKg).toBe(420);
      expect(report.metrics.birdsRemaining).toBe(2991); // 5000 - 8 - 1 - 2000
      expect(report.metrics.totalSalesRevenue).toBe(1596000);
      expect(report.metrics.totalBatchCost).toBe(35000);
      expect(report.metrics.netProfit).toBe(1561000);
    });

    it("generates multi-shed comparison report", async () => {
      const comparison = await ReportService.getShedComparisonReport();
      expect(Array.isArray(comparison)).toBe(true);
      expect(comparison.length).toBeGreaterThanOrEqual(1);

      const shedSummary = comparison.find((s: any) => s.shedNumber === 1);
      expect(shedSummary).toBeDefined();
      expect(shedSummary?.chicksPlaced).toBe(5000);
    });

    it("generates feed reconciliation report", async () => {
      await FeedPurchase.create({
        supplier: "Supreme Feeds",
        date: "2026-01-01",
        feedType: "starter",
        bags: 50,
        bagWeightKg: 50,
        totalKg: 2500,
        ratePerBag: 4200,
        totalAmount: 210000,
        paymentStatus: "paid",
        amountPaid: 210000,
        balanceAmount: 0,
      });

      await FeedIssue.create({
        date: "2026-01-02",
        shedId,
        batchId,
        feedType: "starter",
        bags: 10,
        bagWeightKg: 50,
        totalKg: 500,
        issuedBy: userId,
      });

      const feedReport = await ReportService.getFeedReport();
      expect(feedReport.totalPurchasedKg).toBe(2500);
      expect(feedReport.totalPurchasedAmount).toBe(210000);
      expect(feedReport.totalIssuedKg).toBe(500);
      expect(feedReport.totalConsumedKg).toBe(420);
      expect(feedReport.reconciliationDifferenceKg).toBe(80);
    });

    it("generates expense report categorized by cost center", async () => {
      const expenseReport = await ReportService.getExpenseReport(
        batchId.toString(),
      );
      expect(expenseReport.totalExpense).toBe(35000);
      expect(expenseReport.byCategory.feed).toBe(35000);
    });

    it("generates sales and buyer ledger report", async () => {
      const ledger = await ReportService.getSalesLedgerReport();
      expect(ledger.grandTotalBilled).toBe(1596000);
      expect(ledger.grandTotalPaid).toBe(1000000);
      expect(ledger.grandTotalOutstanding).toBe(596000);
      expect(ledger.buyers.length).toBe(1);
      expect(ledger.buyers[0].buyerName).toBe("Lahore Poultry Traders");
      expect(ledger.buyers[0].balance).toBe(596000);
    });

    it("generates staff wages and attendance report", async () => {
      const staff = await Staff.create({
        name: "Muhammad Ali",
        role: "worker",
        phone: "+923005555555",
        dailyWage: 1000,
        status: "active",
        joiningDate: "2025-01-01",
      });

      await Attendance.create([
        {
          staffId: staff._id,
          date: "2026-02-01",
          status: "present",
          recordedBy: userId,
        },
        {
          staffId: staff._id,
          date: "2026-02-02",
          status: "present",
          recordedBy: userId,
        },
        {
          staffId: staff._id,
          date: "2026-02-03",
          status: "half_day",
          recordedBy: userId,
        },
        {
          staffId: staff._id,
          date: "2026-02-04",
          status: "leave",
          recordedBy: userId,
        },
      ]);

      await StaffAdvance.create({
        staffId: staff._id,
        date: "2026-02-02",
        amount: 500,
        reason: "Medicine expense",
        approvedBy: userId,
      });

      const wageReport = await ReportService.getStaffWagesReport("2026-02");
      expect(wageReport.length).toBe(1);
      const workerReport = wageReport[0];
      expect(workerReport.name).toBe("Muhammad Ali");
      expect(workerReport.presentDays).toBe(2);
      expect(workerReport.halfDays).toBe(1);
      expect(workerReport.grossWage).toBe(2500); // 2000 + 500
      expect(workerReport.advancesDeducted).toBe(500);
      expect(workerReport.netPayable).toBe(2000);
    });
  });

  describe("SyncService Processing & Conflict Management", () => {
    let shedId: mongoose.Types.ObjectId;
    let batchId: mongoose.Types.ObjectId;
    let userId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const user = await User.create({
        username: "worker_sync_test",
        passwordHash: "dummyhash",
        name: "Sync Tester",
        phone: "+923002222222",
        role: "worker",
      });
      userId = user._id;

      const shed = await Shed.create({
        name: "Shed 2",
        shedNumber: 2,
        capacity: 5000,
        status: "active",
      });
      shedId = shed._id;

      const batch = await Batch.create({
        batchNumber: "B-2026-02",
        shedId,
        placementDate: "2026-02-01",
        expectedCloseDate: "2026-03-15",
        supplier: "Hatchery B",
        chicksPlaced: 4000,
        breed: "Cobb 500",
        chickRate: 90,
        initialCost: 360000,
        status: "active",
      });
      batchId = batch._id;
    });

    it("processes sync packet with multiple entity types and verifies database mutations", async () => {
      const packet: SyncPacketInput = {
        userId: userId.toString(),
        deviceId: "dev-tablet-01",
        items: [
          {
            clientMutationId: "mut-dr-1",
            entityType: "DAILY_RECORD",
            action: "CREATE",
            clientTimestamp: "2026-02-01T10:00:00.000Z",
            payload: {
              batchId: batchId.toString(),
              shedId: shedId.toString(),
              date: "2026-02-01",
              ageInDays: 1,
              mortalityCount: 2,
              feedUsedKg: 100,
              feedUsedBags: 2,
              feedType: "starter",
              waterLiters: 200,
              minTemp: 32,
              maxTemp: 34,
            },
          },
          {
            clientMutationId: "mut-wr-1",
            entityType: "WEIGHT_RECORD",
            action: "CREATE",
            clientTimestamp: "2026-02-01T10:05:00.000Z",
            payload: {
              batchId: batchId.toString(),
              shedId: shedId.toString(),
              date: "2026-02-01",
              ageInDays: 1,
              sampleSize: 20,
              averageWeightGrams: 45,
              targetWeightGrams: 45,
              deviationGrams: 0,
            },
          },
          {
            clientMutationId: "mut-fi-1",
            entityType: "FEED_ISSUE",
            action: "CREATE",
            clientTimestamp: "2026-02-01T10:10:00.000Z",
            payload: {
              date: "2026-02-01",
              shedId: shedId.toString(),
              batchId: batchId.toString(),
              feedType: "starter",
              bags: 2,
              bagWeightKg: 50,
              totalKg: 100,
            },
          },
          {
            clientMutationId: "mut-exp-1",
            entityType: "EXPENSE",
            action: "CREATE",
            clientTimestamp: "2026-02-01T10:15:00.000Z",
            payload: {
              batchId: batchId.toString(),
              date: "2026-02-01",
              category: "misc",
              amount: 1500,
              description: "Lime powder spray",
            },
          },
        ],
      };

      const results = await SyncService.processSyncPacket(
        packet,
        userId.toString(),
      );
      expect(results.length).toBe(4);
      expect(results.every((r) => r.status === "synced")).toBe(true);

      // Verify records are now in MongoDB
      const dr = await DailyRecord.findOne({ batchId, date: "2026-02-01" });
      expect(dr).not.toBeNull();
      expect(dr?.mortalityCount).toBe(2);

      const wr = await WeightRecord.findOne({ batchId, date: "2026-02-01" });
      expect(wr).not.toBeNull();
      expect(wr?.averageWeightGrams).toBe(45);

      const exp = await Expense.findOne({ batchId, category: "misc" });
      expect(exp).not.toBeNull();
      expect(exp?.amount).toBe(1500);
    });

    it("handles idempotency: re-sending the same clientMutationId returns synced without re-inserting", async () => {
      const packet: SyncPacketInput = {
        userId: userId.toString(),
        deviceId: "dev-tablet-01",
        items: [
          {
            clientMutationId: "mut-idempotent-1",
            entityType: "EXPENSE",
            action: "CREATE",
            clientTimestamp: "2026-02-02T10:00:00.000Z",
            payload: {
              batchId: batchId.toString(),
              date: "2026-02-02",
              category: "misc",
              amount: 3000,
              description: "Rice husk litter bags",
            },
          },
        ],
      };

      // First sync
      const firstResults = await SyncService.processSyncPacket(
        packet,
        userId.toString(),
      );
      expect(firstResults[0].status).toBe("synced");

      // Second sync with identical clientMutationId
      const secondResults = await SyncService.processSyncPacket(
        packet,
        userId.toString(),
      );
      expect(secondResults[0].status).toBe("synced");
      expect(secondResults[0].message).toContain(
        "Already processed idempotently",
      );

      // Ensure expense was not duplicated in database
      const count = await Expense.countDocuments({ batchId, category: "misc" });
      expect(count).toBe(1);
    });

    it("applies Last-Write-Wins (LWW) conflict resolution for concurrent updates", async () => {
      // 1. Initial write
      await SyncService.processSyncPacket(
        {
          userId: userId.toString(),
          deviceId: "dev-1",
          items: [
            {
              clientMutationId: "mut-lww-1",
              entityType: "DAILY_RECORD",
              action: "CREATE",
              clientTimestamp: "2026-02-03T08:00:00.000Z",
              payload: {
                batchId: batchId.toString(),
                shedId: shedId.toString(),
                date: "2026-02-03",
                ageInDays: 3,
                mortalityCount: 1,
                feedUsedKg: 100,
                feedUsedBags: 2,
                feedType: "starter",
                waterLiters: 150,
                minTemp: 30,
                maxTemp: 33,
              },
            },
          ],
        },
        userId.toString(),
      );

      // 2. Newer update from another device with higher timestamp
      await SyncService.processSyncPacket(
        {
          userId: userId.toString(),
          deviceId: "dev-2",
          items: [
            {
              clientMutationId: "mut-lww-2",
              entityType: "DAILY_RECORD",
              action: "UPDATE",
              clientTimestamp: "2026-02-03T18:00:00.000Z",
              payload: {
                batchId: batchId.toString(),
                shedId: shedId.toString(),
                date: "2026-02-03",
                ageInDays: 3,
                mortalityCount: 4,
                feedUsedKg: 120,
                feedUsedBags: 2.4,
                feedType: "starter",
                waterLiters: 180,
                minTemp: 30,
                maxTemp: 33,
              },
            },
          ],
        },
        userId.toString(),
      );

      const record = await DailyRecord.findOne({ batchId, date: "2026-02-03" });
      expect(record?.mortalityCount).toBe(4);
      expect(record?.feedUsedKg).toBe(120);
    });
  });
});
