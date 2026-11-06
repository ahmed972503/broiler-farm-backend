import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  User,
  Shed,
  Batch,
  DailyRecord,
  WeightRecord,
  VaccinationTemplate,
  VaccinationTask,
  MedicineRecord,
  FeedPurchase,
  FeedIssue,
  FeedStock,
  InventoryItem,
  Expense,
  Sale,
  BuyerPayment,
  Staff,
  Attendance,
  StaffAdvance,
  FarmSettings,
} from "../models";
import { config } from "../config";
import {
  STANDARD_BROILER_VACCINATION_SCHEDULE,
  DEFAULT_FARM_SETTINGS,
  TARGET_WEIGHTS_BY_DAY,
  bagsToKg,
  calculateFCR,
  calculateCostPerKg,
  calculateBatchProfit,
  calculateLivabilityPercent,
  calculateEPEF,
  roundTo,
} from "@broiler/shared";
import { AlertService } from "../services/alertService";

export async function seedDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CRITICAL SAFETY CHECK: Seed script cannot run in production (NODE_ENV=production). Aborting database wipe.",
    );
  }

  console.log("[Seed] Connecting to MongoDB...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongodbUri);
  }

  console.log("[Seed] Clearing existing collections...");
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  console.log("[Seed] Seeding Farm Settings...");
  await FarmSettings.create(DEFAULT_FARM_SETTINGS);

  console.log("[Seed] Seeding Vaccination Template...");
  const vaccineTemplate = await VaccinationTemplate.create({
    name: "Pakistan Standard Broiler Vaccination Schedule",
    description:
      "Field-tested schedule for commercial broilers in Punjab / Sindh",
    isDefault: true,
    schedule: STANDARD_BROILER_VACCINATION_SCHEDULE,
  });

  console.log("[Seed] Seeding 5 Sheds...");
  const shed1 = await Shed.create({
    name: "Shed 1 - North Wing",
    shedNumber: 1,
    capacity: 5000,
    status: "active",
    notes: "Environment controlled tunnel ventilation",
  });
  const shed2 = await Shed.create({
    name: "Shed 2 - South Wing",
    shedNumber: 2,
    capacity: 5000,
    status: "active",
    notes: "Pad cooling with automatic pan feeders",
  });
  const shed3 = await Shed.create({
    name: "Shed 3 - East Wing",
    shedNumber: 3,
    capacity: 6000,
    status: "active",
    notes: "High capacity tunnel ventilated shed",
  });
  const shed4 = await Shed.create({
    name: "Shed 4 - West Wing",
    shedNumber: 4,
    capacity: 5500,
    status: "active",
    notes: "Nipple drinking system",
  });
  const shed5 = await Shed.create({
    name: "Shed 5 - Central Wing",
    shedNumber: 5,
    capacity: 7000,
    status: "active",
    notes: "Owner monitored high-density broiler house",
  });

  const allSheds = [shed1, shed2, shed3, shed4, shed5];

  console.log("[Seed] Seeding Users (1 Admin, 4 Workers)...");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const workerPasswordHash = await bcrypt.hash("worker123", 10);

  const adminUser = await User.create({
    username: "admin",
    passwordHash: adminPasswordHash,
    name: "Haji Muhammad Ahmed",
    phone: "0300-1234567",
    role: "admin",
    assignedShedId: shed5._id,
    isActive: true,
    mustChangePassword: true,
  });

  const worker1 = await User.create({
    username: "worker1",
    passwordHash: workerPasswordHash,
    name: "Bashir Ahmed",
    phone: "0301-1111111",
    role: "worker",
    assignedShedId: shed1._id,
    isActive: true,
    mustChangePassword: true,
  });

  const worker2 = await User.create({
    username: "worker2",
    passwordHash: workerPasswordHash,
    name: "Rashid Khan",
    phone: "0302-2222222",
    role: "worker",
    assignedShedId: shed2._id,
    isActive: true,
    mustChangePassword: true,
  });

  const worker3 = await User.create({
    username: "worker3",
    passwordHash: workerPasswordHash,
    name: "Tariq Mehmood",
    phone: "0303-3333333",
    role: "worker",
    assignedShedId: shed3._id,
    isActive: true,
    mustChangePassword: true,
  });

  const worker4 = await User.create({
    username: "worker4",
    passwordHash: workerPasswordHash,
    name: "Sajid Hussain",
    phone: "0304-4444444",
    role: "worker",
    assignedShedId: shed4._id,
    isActive: true,
    mustChangePassword: true,
  });

  // Link workers back to sheds
  shed1.assignedWorkerId = worker1._id as any;
  await shed1.save();
  shed2.assignedWorkerId = worker2._id as any;
  await shed2.save();
  shed3.assignedWorkerId = worker3._id as any;
  await shed3.save();
  shed4.assignedWorkerId = worker4._id as any;
  await shed4.save();
  shed5.assignedWorkerId = adminUser._id as any;
  await shed5.save();

  console.log("[Seed] Seeding Staff & Attendance...");
  const staffMembers = [
    {
      name: "Bashir Ahmed",
      phone: "0301-1111111",
      assignedShedId: shed1._id,
      dailyWage: 1200,
    },
    {
      name: "Rashid Khan",
      phone: "0302-2222222",
      assignedShedId: shed2._id,
      dailyWage: 1200,
    },
    {
      name: "Tariq Mehmood",
      phone: "0303-3333333",
      assignedShedId: shed3._id,
      dailyWage: 1300,
    },
    {
      name: "Sajid Hussain",
      phone: "0304-4444444",
      assignedShedId: shed4._id,
      dailyWage: 1200,
    },
    {
      name: "Ghulam Abbas (Night Guard)",
      phone: "0305-5555555",
      assignedShedId: null,
      dailyWage: 1100,
    },
  ];

  for (const s of staffMembers) {
    const staffDoc = await Staff.create({
      name: s.name,
      phone: s.phone,
      role: "worker",
      assignedShedId: s.assignedShedId,
      dailyWage: s.dailyWage,
      status: "active",
      joiningDate: "2025-01-01",
    });

    // 25 days of attendance for current month
    for (let day = 1; day <= 25; day++) {
      const dateStr = `2026-03-${day.toString().padStart(2, "0")}`;
      await Attendance.create({
        staffId: staffDoc._id,
        date: dateStr,
        status: day % 7 === 0 ? "leave" : "present",
        dailyWageAmount: s.dailyWage,
        advanceDeduction: 0,
        recordedBy: adminUser._id,
      });
    }

    // Advance payment
    if (s.name.includes("Rashid")) {
      await StaffAdvance.create({
        staffId: staffDoc._id,
        date: "2026-03-10",
        amount: 3000,
        reason: "Family medical expense",
        status: "pending",
      });
    }
  }

  console.log("[Seed] Seeding Initial Feed Inventory & Purchases...");
  await FeedStock.create({
    feedType: "starter",
    currentBags: 45,
    currentKg: 2250,
    reorderThresholdBags: 20,
    bagWeightKg: 50,
  });
  await FeedStock.create({
    feedType: "grower",
    currentBags: 60,
    currentKg: 3000,
    reorderThresholdBags: 25,
    bagWeightKg: 50,
  });
  await FeedStock.create({
    feedType: "finisher",
    currentBags: 14,
    currentKg: 700,
    reorderThresholdBags: 20,
    bagWeightKg: 50,
  }); // Triggers low-stock alert!

  await FeedPurchase.create({
    supplier: "National Feeds Ltd",
    date: "2026-02-28",
    invoiceNo: "NF-2026-8812",
    feedType: "starter",
    bags: 150,
    bagWeightKg: 50,
    totalKg: 7500,
    ratePerBag: 4300,
    totalAmount: 645000,
    paymentStatus: "paid",
    amountPaid: 645000,
    balanceAmount: 0,
  });

  await FeedPurchase.create({
    supplier: "Supreme Feeds Okara",
    date: "2026-03-10",
    invoiceNo: "SF-7741",
    feedType: "grower",
    bags: 200,
    bagWeightKg: 50,
    totalKg: 10000,
    ratePerBag: 4200,
    totalAmount: 840000,
    paymentStatus: "partial",
    amountPaid: 500000,
    balanceAmount: 340000,
  });

  console.log("[Seed] Seeding Medical & Consumable Inventory...");
  await InventoryItem.create({
    category: "medicine",
    name: "Enrofloxacin 10% Oral",
    quantity: 8,
    unit: "liters",
    expiryDate: "2026-11-30",
    reorderLevel: 2,
  });
  await InventoryItem.create({
    category: "medicine",
    name: "Colistin Sulfate 100%",
    quantity: 12,
    unit: "kg",
    expiryDate: "2027-03-15",
    reorderLevel: 3,
  });
  await InventoryItem.create({
    category: "medicine",
    name: "Multivitamin Super Soluble",
    quantity: 25,
    unit: "packs",
    expiryDate: "2026-04-15",
    reorderLevel: 5,
  }); // Near expiry!
  await InventoryItem.create({
    category: "equipment",
    name: "Gas Brooder Infrared Heaters",
    quantity: 15,
    unit: "units",
    reorderLevel: 2,
  });
  await InventoryItem.create({
    category: "consumable",
    name: "Rice Husk Bedding",
    quantity: 120,
    unit: "bags",
    reorderLevel: 30,
  });

  console.log(
    "[Seed] Seeding Closed Batch for Shed 1 (Prior Successful Cycle)...",
  );
  const closedBatch = await Batch.create({
    batchNumber: "FLOCK-S1-2026-01",
    shedId: shed1._id,
    chicksPlaced: 5000,
    placementDate: "2026-01-10",
    expectedCloseDate: "2026-02-14",
    supplier: "Jadeed Chicks Khanewal",
    breed: "Cobb 500",
    chickRate: 105,
    initialCost: 525000,
    status: "closed",
    closedAt: "2026-02-14",
    closeSummary: {
      closedAt: "2026-02-14",
      finalAgeDays: 35,
      birdsPlaced: 5000,
      birdsRemaining: 0,
      totalMortality: 145,
      mortalityRatePercent: 2.9,
      totalCulls: 25,
      totalBirdsSold: 4830,
      totalLiveWeightSoldKg: 10850,
      averageLiveWeightSoldKg: 2.246,
      totalFeedConsumedKg: 16730,
      fcr: 1.542,
      totalChickCost: 525000,
      totalFeedCost: 1420000,
      totalMedicineCost: 65000,
      totalOtherExpenses: 110000,
      totalBatchCost: 2120000,
      costPerKgSold: 195.39,
      totalSalesRevenue: 4177250,
      netProfit: 2057250,
      livabilityPercent: 96.6,
      epef: 393.2,
      notes: "Exceptional FCR and market rate",
    },
  });

  // Prior batch sales
  await Sale.create({
    batchId: closedBatch._id,
    shedId: shed1._id,
    buyerName: "Haji Aslam Chicken Merchant",
    buyerPhone: "0300-8888888",
    date: "2026-02-14",
    birdsSold: 4830,
    totalLiveWeightKg: 10850,
    averageWeightKg: 2.246,
    ratePerKg: 385,
    totalAmount: 4177250,
    amountPaid: 4177250,
    balanceAmount: 0,
    paymentStatus: "paid",
    vehicleNo: "LES-9922",
    createdBy: adminUser._id,
  });

  console.log("[Seed] Seeding 5 Active Batches at Staggered Ages...");
  const activeBatchesConfig = [
    {
      shed: shed1,
      daysAgo: 28,
      placed: 5000,
      breed: "Cobb 500",
      rate: 115,
      worker: worker1,
      batchNum: "FLOCK-S1-2026-02",
    },
    {
      shed: shed2,
      daysAgo: 21,
      placed: 5000,
      breed: "Ross 308",
      rate: 112,
      worker: worker2,
      batchNum: "FLOCK-S2-2026-01",
    },
    {
      shed: shed3,
      daysAgo: 14,
      placed: 6000,
      breed: "Cobb 500",
      rate: 115,
      worker: worker3,
      batchNum: "FLOCK-S3-2026-01",
    },
    {
      shed: shed4,
      daysAgo: 7,
      placed: 5500,
      breed: "Ross 308",
      rate: 110,
      worker: worker4,
      batchNum: "FLOCK-S4-2026-01",
    },
    {
      shed: shed5,
      daysAgo: 3,
      placed: 7000,
      breed: "Cobb 500",
      rate: 118,
      worker: adminUser,
      batchNum: "FLOCK-S5-2026-01",
    },
  ];

  const today = new Date();

  for (const cfg of activeBatchesConfig) {
    const placementDateObj = new Date(today);
    placementDateObj.setDate(placementDateObj.getDate() - cfg.daysAgo);
    const placementDateStr = placementDateObj.toISOString().split("T")[0];

    const expectedCloseObj = new Date(placementDateObj);
    expectedCloseObj.setDate(expectedCloseObj.getDate() + 38);
    const expectedCloseStr = expectedCloseObj.toISOString().split("T")[0];

    const batch = await Batch.create({
      batchNumber: cfg.batchNum,
      shedId: cfg.shed._id,
      chicksPlaced: cfg.placed,
      placementDate: placementDateStr,
      expectedCloseDate: expectedCloseStr,
      supplier: "Jadeed Chicks Faisalabad",
      breed: cfg.breed,
      chickRate: cfg.rate,
      initialCost: cfg.placed * cfg.rate,
      status: "active",
    });

    cfg.shed.currentBatchId = batch._id as any;
    await cfg.shed.save();

    // Initial chick expense
    await Expense.create({
      batchId: batch._id,
      category: "chicks",
      amount: cfg.placed * cfg.rate,
      date: placementDateStr,
      description: `Chick placement: ${cfg.placed} day-old chicks (${cfg.breed})`,
      paymentMethod: "bank_transfer",
      paidTo: "Jadeed Chicks",
      createdBy: adminUser._id,
    });

    // Auto-generate vaccination tasks
    for (const vItem of vaccineTemplate.schedule) {
      const dueDate = new Date(placementDateObj);
      dueDate.setDate(dueDate.getDate() + vItem.ageInDays);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      const isCompleted = cfg.daysAgo >= vItem.ageInDays;
      await VaccinationTask.create({
        batchId: batch._id,
        shedId: cfg.shed._id,
        ageInDays: vItem.ageInDays,
        dueDate: dueDateStr,
        vaccineName: vItem.vaccineName,
        route: vItem.route,
        status: isCompleted ? "completed" : "pending",
        completedAt: isCompleted ? dueDateStr : undefined,
        completedBy: isCompleted ? cfg.worker._id : undefined,
        notes: isCompleted
          ? "Administered correctly with milk powder stabilizer"
          : "",
      });
    }

    // Seed realistic Daily Records for all elapsed days up to today
    for (let age = 0; age <= cfg.daysAgo; age++) {
      const recordDate = new Date(placementDateObj);
      recordDate.setDate(recordDate.getDate() + age);
      const recordDateStr = recordDate.toISOString().split("T")[0];

      // Feed type by age
      let feedType: "starter" | "grower" | "finisher" = "starter";
      if (age >= 25) feedType = "finisher";
      else if (age >= 11) feedType = "grower";

      // Daily feed consumed increases with age
      const gramsPerBird = Math.min(180, Math.max(15, age * 4.5));
      const dailyFeedKg = roundTo((cfg.placed * gramsPerBird) / 1000, 1);
      const feedBags = roundTo(dailyFeedKg / 50, 1);

      // Realistic mortality (2 to 5 birds per day)
      const dailyMortality = Math.floor(Math.random() * 4) + 1;
      const dailyCulls = age % 5 === 0 ? 1 : 0;

      const minTemp = roundTo(23 + Math.random() * 2, 1);
      const maxTemp = roundTo(29 + Math.random() * 3, 1);

      await DailyRecord.create({
        batchId: batch._id,
        shedId: cfg.shed._id,
        date: recordDateStr,
        ageInDays: age,
        mortalityCount: dailyMortality,
        culls: dailyCulls,
        feedUsedBags: feedBags,
        feedUsedKg: dailyFeedKg,
        feedType,
        waterLiters: roundTo(dailyFeedKg * 2.2, 0),
        minTemp,
        maxTemp,
        litterCondition: "normal",
        isLocked: recordDateStr < today.toISOString().split("T")[0],
        createdBy: cfg.worker._id,
      });
    }

    // Seed weekly sample weights
    for (let sampleAge = 7; sampleAge <= cfg.daysAgo; sampleAge += 7) {
      const sampleDate = new Date(placementDateObj);
      sampleDate.setDate(sampleDate.getDate() + sampleAge);
      const sampleDateStr = sampleDate.toISOString().split("T")[0];

      const targetWeight = TARGET_WEIGHTS_BY_DAY[sampleAge] || 500;
      // Actual weight variance +/- 20g
      const actualWeight = targetWeight + Math.floor(Math.random() * 40) - 15;

      await WeightRecord.create({
        batchId: batch._id,
        shedId: cfg.shed._id,
        date: sampleDateStr,
        ageInDays: sampleAge,
        sampleSize: 50,
        averageWeightGrams: actualWeight,
        targetWeightGrams: targetWeight,
        deviationGrams: actualWeight - targetWeight,
        notes: `Sample of 50 birds randomly weighed across shed`,
        createdBy: cfg.worker._id,
      });
    }
  }

  // Active sales on Shed 1 (partial lifting)
  const activeBatch1 = await Batch.findOne({ batchNumber: "FLOCK-S1-2026-02" });
  if (activeBatch1) {
    await Sale.create({
      batchId: activeBatch1._id,
      shedId: shed1._id,
      buyerName: "Malik Tariq Broiler Trader Lahore",
      buyerPhone: "0300-5555555",
      date: today.toISOString().split("T")[0],
      birdsSold: 1500,
      totalLiveWeightKg: 2850,
      averageWeightKg: 1.9,
      ratePerKg: 390,
      totalAmount: 1111500,
      amountPaid: 600000,
      balanceAmount: 511500,
      paymentStatus: "partial",
      vehicleNo: "FD-4019",
      notes: "First thinning lifting (1500 heavy birds)",
      createdBy: adminUser._id,
    });
  }

  console.log("[Seed] Triggering Alert Sweep...");
  await AlertService.runAlertSweep();

  console.log(
    "[Seed] Database successfully seeded with 5 sheds, active flocks, 30 days of data, and admin/worker accounts!",
  );
  console.log("----------------------------------------------------");
  console.log("Admin:   username: admin    password: admin123");
  console.log("Worker:  username: worker1  password: worker123 (Shed 1)");
  console.log("Worker:  username: worker2  password: worker123 (Shed 2)");
  console.log("Worker:  username: worker3  password: worker123 (Shed 3)");
  console.log("Worker:  username: worker4  password: worker123 (Shed 4)");
  console.log("----------------------------------------------------");
}

// Allow direct execution: `node dist/utils/seed.js` or `ts-node src/utils/seed.ts`
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Seed Error]:", err);
      process.exit(1);
    });
}
