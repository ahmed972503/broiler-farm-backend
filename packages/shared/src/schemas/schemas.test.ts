import {
  LoginSchema,
  CreateUserSchema,
  CreateShedSchema,
  CreateBatchSchema,
  CloseBatchSchema,
  CreateDailyRecordSchema,
  CreateWeightRecordSchema,
  CompleteVaccinationTaskSchema,
  CreateMedicineRecordSchema,
  CreateFeedPurchaseSchema,
  CreateFeedIssueSchema,
  CreateInventoryItemSchema,
  CreateExpenseSchema,
  CreateSaleSchema,
  CreateBuyerPaymentSchema,
  CreateStaffSchema,
  RecordAttendanceSchema,
  CreateStaffAdvanceSchema,
  SyncPacketSchema,
  UpdateFarmSettingsSchema,
} from "./index";

describe("Zod Schemas Validation Tests", () => {
  it("validates LoginSchema correctly", () => {
    const valid = LoginSchema.safeParse({
      username: "admin",
      password: "password123",
    });
    expect(valid.success).toBe(true);

    const invalid = LoginSchema.safeParse({ username: "ad", password: "1" });
    expect(invalid.success).toBe(false);
  });

  it("validates CreateUserSchema correctly", () => {
    const valid = CreateUserSchema.safeParse({
      username: "worker1",
      password: "password123",
      name: "Bashir Ahmed",
      phone: "03001234567",
      role: "worker",
      assignedShedId: "shed-1",
    });
    expect(valid.success).toBe(true);

    const invalidRole = CreateUserSchema.safeParse({
      username: "worker1",
      password: "123",
      name: "B",
      phone: "123",
      role: "invalid_role",
    });
    expect(invalidRole.success).toBe(false);
  });

  it("validates CreateShedSchema correctly", () => {
    const valid = CreateShedSchema.safeParse({
      name: "Shed 1 - East Wing",
      shedNumber: 1,
      capacity: 5000,
      status: "active",
    });
    expect(valid.success).toBe(true);

    const invalidCapacity = CreateShedSchema.safeParse({
      name: "Shed 1",
      shedNumber: 1,
      capacity: -50,
    });
    expect(invalidCapacity.success).toBe(false);
  });

  it("validates CreateBatchSchema correctly", () => {
    const valid = CreateBatchSchema.safeParse({
      batchNumber: "FLOCK-S1-2026-01",
      shedId: "shed-1",
      chicksPlaced: 5000,
      placementDate: "2026-03-01",
      expectedCloseDate: "2026-04-10",
      supplier: "Jadeed Chicks",
      breed: "Cobb 500",
      chickRate: 115,
    });
    expect(valid.success).toBe(true);
  });

  it("validates CloseBatchSchema correctly", () => {
    const valid = CloseBatchSchema.safeParse({
      closedAt: "2026-04-10",
      finalMortalityAdjustment: 5,
      notes: "All birds sold",
    });
    expect(valid.success).toBe(true);
  });

  it("validates CreateDailyRecordSchema correctly", () => {
    const valid = CreateDailyRecordSchema.safeParse({
      batchId: "batch-1",
      shedId: "shed-1",
      date: "2026-03-15",
      mortalityCount: 6,
      culls: 1,
      feedUsedBags: 8.5,
      feedType: "grower",
      waterLiters: 650,
      minTemp: 24.5,
      maxTemp: 31.0,
      litterCondition: "normal",
    });
    expect(valid.success).toBe(true);

    const invalidTemp = CreateDailyRecordSchema.safeParse({
      batchId: "batch-1",
      shedId: "shed-1",
      date: "2026-03-15",
      mortalityCount: -1,
      feedUsedBags: 5,
      feedType: "grower",
      waterLiters: 500,
      minTemp: 90, // Out of realistic broiler range
      maxTemp: 100,
    });
    expect(invalidTemp.success).toBe(false);
  });

  it("validates CreateWeightRecordSchema correctly", () => {
    const valid = CreateWeightRecordSchema.safeParse({
      batchId: "batch-1",
      shedId: "shed-1",
      date: "2026-03-21",
      ageInDays: 21,
      sampleSize: 50,
      averageWeightGrams: 1050,
    });
    expect(valid.success).toBe(true);

    const tooSmallSample = CreateWeightRecordSchema.safeParse({
      batchId: "batch-1",
      shedId: "shed-1",
      date: "2026-03-21",
      ageInDays: 21,
      sampleSize: 2, // minimum is 5
      averageWeightGrams: 1050,
    });
    expect(tooSmallSample.success).toBe(false);
  });

  it("validates CompleteVaccinationTaskSchema and CreateMedicineRecordSchema", () => {
    const validVaccine = CompleteVaccinationTaskSchema.safeParse({
      taskId: "task-1",
      notes: "Administered in morning water",
    });
    expect(validVaccine.success).toBe(true);

    const validMedicine = CreateMedicineRecordSchema.safeParse({
      batchId: "batch-1",
      shedId: "shed-1",
      date: "2026-03-10",
      medicineName: "Colistin Sulfate",
      dosage: "1g per 4L water",
      route: "drinking_water",
      reason: "Mild bacterial enteritis",
      withdrawalPeriodDays: 3,
    });
    expect(validMedicine.success).toBe(true);
  });

  it("validates Feed Purchases and Issues", () => {
    const validPurchase = CreateFeedPurchaseSchema.safeParse({
      supplier: "National Feeds",
      date: "2026-03-01",
      feedType: "starter",
      bags: 100,
      bagWeightKg: 50,
      ratePerBag: 4200,
      paymentStatus: "paid",
      amountPaid: 420000,
    });
    expect(validPurchase.success).toBe(true);

    const validIssue = CreateFeedIssueSchema.safeParse({
      date: "2026-03-02",
      shedId: "shed-1",
      batchId: "batch-1",
      feedType: "starter",
      bags: 6,
    });
    expect(validIssue.success).toBe(true);
  });

  it("validates Inventory, Expenses, Sales, and Staff", () => {
    const validInventory = CreateInventoryItemSchema.safeParse({
      category: "medicine",
      name: "Enrofloxacin 10%",
      quantity: 10,
      unit: "bottles",
      expiryDate: "2027-01-01",
      reorderLevel: 2,
    });
    expect(validInventory.success).toBe(true);

    const validExpense = CreateExpenseSchema.safeParse({
      category: "electricity",
      amount: 45000,
      date: "2026-03-10",
      description: "Monthly WAPDA bill for farm",
      paymentMethod: "bank_transfer",
    });
    expect(validExpense.success).toBe(true);

    const validSale = CreateSaleSchema.safeParse({
      batchId: "batch-1",
      shedId: "shed-1",
      buyerName: "Haji Aslam Chicken Merchant",
      date: "2026-04-05",
      birdsSold: 2500,
      totalLiveWeightKg: 5500,
      ratePerKg: 380, // editable
      amountPaid: 1500000,
      paymentStatus: "partial",
    });
    expect(validSale.success).toBe(true);

    const validStaff = CreateStaffSchema.safeParse({
      name: "Rashid Khan",
      phone: "03123456789",
      role: "worker",
      dailyWage: 1200,
      joiningDate: "2025-01-01",
    });
    expect(validStaff.success).toBe(true);

    const validAttendance = RecordAttendanceSchema.safeParse({
      staffId: "staff-1",
      date: "2026-03-15",
      status: "present",
      advanceDeduction: 0,
    });
    expect(validAttendance.success).toBe(true);

    const validAdvance = CreateStaffAdvanceSchema.safeParse({
      staffId: "staff-1",
      date: "2026-03-15",
      amount: 3000,
      reason: "Family emergency",
    });
    expect(validAdvance.success).toBe(true);
  });

  it("validates SyncPacketSchema correctly", () => {
    const validSync = SyncPacketSchema.safeParse({
      deviceId: "device-worker-phone-1",
      userId: "user-worker-1",
      items: [
        {
          clientMutationId: "a1b2c3d4-e5f6-4a1b-9c2d-3e4f5a6b7c8d",
          entityType: "DAILY_RECORD",
          action: "CREATE",
          payload: { mortalityCount: 4, feedUsedBags: 7 },
          clientTimestamp: "2026-03-15T18:00:00.000Z",
        },
      ],
    });
    expect(validSync.success).toBe(true);
  });

  it("validates UpdateFarmSettingsSchema", () => {
    const validSettings = UpdateFarmSettingsSchema.safeParse({
      farmName: "Bismillah Poultry Farm",
      alertThresholds: {
        mortalitySpikePercentDaily: 1.0,
        lowFeedStockBags: 25,
      },
    });
    expect(validSettings.success).toBe(true);
  });
});
