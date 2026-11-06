import { z } from "zod";
import {
  FEED_TYPES,
  LITTER_CONDITIONS,
  SHED_STATUSES,
  EXPENSE_CATEGORIES,
} from "../constants";

// Authentication Schemas
export const LoginSchema = z.object({
  username: z
    .string()
    .min(3, "Username or phone must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10, "Valid refresh token required"),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, dash/underscore only"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  role: z.enum(["admin", "worker"]),
  assignedShedId: z.string().optional().nullable(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const ResetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Shed Schemas
export const CreateShedSchema = z.object({
  name: z.string().min(2, "Shed name is required"),
  shedNumber: z.number().int().min(1).max(20),
  capacity: z.number().int().positive("Capacity must be positive"),
  status: z.enum(SHED_STATUSES).default("empty"),
  assignedWorkerId: z.string().optional().nullable(),
  notes: z.string().optional(),
});
export type CreateShedInput = z.infer<typeof CreateShedSchema>;

export const UpdateShedSchema = CreateShedSchema.partial();
export type UpdateShedInput = z.infer<typeof UpdateShedSchema>;

// Batch Schemas
export const CreateBatchSchema = z.object({
  batchNumber: z.string().min(3, "Batch flock number is required"),
  shedId: z.string().min(1, "Shed ID is required"),
  chicksPlaced: z
    .number()
    .int()
    .positive("Chicks placed must be greater than zero"),
  placementDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Placement date format YYYY-MM-DD"),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected close date format YYYY-MM-DD"),
  supplier: z.string().min(2, "Supplier name required"),
  breed: z.string().default("Cobb 500"),
  chickRate: z.number().positive("Chick rate in PKR must be positive"),
});
export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;

export const CloseBatchSchema = z.object({
  closedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Close date format YYYY-MM-DD"),
  finalMortalityAdjustment: z.number().int().min(0).default(0),
  finalCullsAdjustment: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});
export type CloseBatchInput = z.infer<typeof CloseBatchSchema>;

// Daily Record Schema (Worker UI & Paper Register Optimized)
export const CreateDailyRecordSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  shedId: z.string().min(1, "Shed ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  // Opening stock
  openingFeedStockBags: z.number().min(0, "Opening feed stock cannot be negative").default(0),
  openingBirds: z.number().int().min(0).optional(),
  // Shift-specific Feed
  feedUsedDayShiftBags: z.number().min(0, "Day shift feed cannot be negative").default(0),
  feedUsedNightShiftBags: z.number().min(0, "Night shift feed cannot be negative").default(0),
  feedUsedBags: z.number().min(0).optional(), // 24h total or legacy input
  feedUsedKg: z.number().min(0).optional(),
  feedReceivedBags: z.number().min(0).default(0),
  feedTransferredOutBags: z.number().min(0).default(0),
  closingFeedStockBags: z.number().min(0).optional(),
  feedRemarks: z.string().optional(),
  // Shift-specific Mortality
  mortalityDayShift: z.number().int().min(0, "Day mortality cannot be negative").default(0),
  mortalityDayCause: z.string().optional(),
  mortalityNightShift: z.number().int().min(0, "Night mortality cannot be negative").default(0),
  mortalityNightCause: z.string().optional(),
  mortalityCount: z.number().int().min(0, "Mortality cannot be negative").optional(), // legacy or 24h
  mortalityCause: z.string().optional(),
  culls: z.number().int().min(0, "Culls cannot be negative").default(0),
  liftedBirds: z.number().int().min(0).default(0),
  // Unconfirmed paper column "E.S"
  customColumnES: z.number().optional().nullable(),
  feedType: z.enum(FEED_TYPES).default("grower"),
  waterLiters: z.number().min(0, "Water consumed cannot be negative").default(0),
  minTemp: z.number().min(0).max(60, "Temperature realistic range 0-60 C").default(24),
  maxTemp: z.number().min(0).max(60, "Temperature realistic range 0-60 C").default(30),
  litterCondition: z.enum(LITTER_CONDITIONS).default("normal"),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  shift: z.enum(["day", "night", "full"]).optional(),
  clientUpdatedAt: z.string().optional(),
});
export type CreateDailyRecordInput = z.infer<typeof CreateDailyRecordSchema>;

export const UpdateDailyRecordSchema = CreateDailyRecordSchema.partial().extend(
  {
    id: z.string().optional(),
  },
);
export type UpdateDailyRecordInput = z.infer<typeof UpdateDailyRecordSchema>;

export const UnlockDailyRecordSchema = z.object({
  reason: z.string().min(3, "Reason for unlocking is required"),
});

// Weight Record Schema
export const CreateWeightRecordSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  shedId: z.string().min(1, "Shed ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  ageInDays: z.number().int().min(0).max(100),
  sampleSize: z.number().int().min(5, "Sample size must be at least 5 birds"),
  averageWeightGrams: z.number().positive("Average weight must be positive"),
  notes: z.string().optional(),
  clientUpdatedAt: z.string().optional(),
});
export type CreateWeightRecordInput = z.infer<typeof CreateWeightRecordSchema>;

// Vaccination & Medicine Schemas
export const CompleteVaccinationTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  completedAt: z.string().optional(),
  notes: z.string().optional(),
});
export type CompleteVaccinationTaskInput = z.infer<
  typeof CompleteVaccinationTaskSchema
>;

export const CreateMedicineRecordSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  shedId: z.string().min(1, "Shed ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  medicineName: z.string().min(2, "Medicine name is required"),
  dosage: z.string().default("As directed"),
  route: z.string().default("drinking_water"),
  reason: z.string().default("General flock health / supplement"),
  withdrawalPeriodDays: z.number().int().min(0).default(0),
  withdrawalEndDate: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  cost: z.number().optional(),
  isVaccine: z.boolean().default(false),
  notes: z.string().optional(),
  clientUpdatedAt: z.string().optional(),
});
export type CreateMedicineRecordInput = z.infer<
  typeof CreateMedicineRecordSchema
>;

export const DailyMedicineItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Medicine name is required"),
  category: z
    .enum([
      "water_medication",
      "supplement",
      "antibiotic",
      "vitamin",
      "acidifier",
      "electrolyte",
      "vaccine",
      "other",
    ])
    .default("supplement"),
  isVaccine: z.boolean().default(false),
  dosage: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  cost: z.number().optional(),
  route: z.string().optional(),
  notes: z.string().optional(),
});
export type DailyMedicineItemInput = z.infer<typeof DailyMedicineItemSchema>;

export const CreateDailyMedicineSheetSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  shedId: z.string().min(1, "Shed ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  items: z.array(DailyMedicineItemSchema),
  clientUpdatedAt: z.string().optional(),
});
export type CreateDailyMedicineSheetInput = z.infer<
  typeof CreateDailyMedicineSheetSchema
>;

// Feed Purchase, Issue & Transfer Schemas
export const CreateFeedTransferSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  partyName: z.string().min(2, "Party / Neighboring farm name is required"),
  type: z.enum(["transfer_in", "transfer_out"]),
  brand: z.string().min(2, "Feed brand is required (e.g. Star Feed, Chenab Feed)"),
  feedType: z.enum(FEED_TYPES),
  bags: z.number().positive("Bags count must be positive"),
  bagWeightKg: z.number().positive().default(50.0),
  notes: z.string().optional(),
  clientUpdatedAt: z.string().optional(),
});
export type CreateFeedTransferInput = z.infer<typeof CreateFeedTransferSchema>;

// Feed Purchase & Issue Schemas
export const CreateFeedPurchaseSchema = z.object({
  supplier: z.string().min(2, "Supplier name is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  invoiceNo: z.string().optional(),
  feedType: z.enum(FEED_TYPES),
  bags: z.number().int().positive("Bags count must be positive"),
  bagWeightKg: z.number().positive().default(50.0),
  ratePerBag: z.number().positive("Rate per bag in PKR must be positive"),
  paymentStatus: z.enum(["paid", "partial", "pending"]).default("pending"),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional(),
});
export type CreateFeedPurchaseInput = z.infer<typeof CreateFeedPurchaseSchema>;

export const CreateFeedIssueSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  shedId: z.string().min(1, "Shed ID is required"),
  batchId: z.string().min(1, "Batch ID is required"),
  feedType: z.enum(FEED_TYPES),
  bags: z.number().min(0.5, "Minimum 0.5 bag"),
  bagWeightKg: z.number().positive().default(50.0),
  issuedTo: z.string().optional(),
  notes: z.string().optional(),
  clientUpdatedAt: z.string().optional(),
});
export type CreateFeedIssueInput = z.infer<typeof CreateFeedIssueSchema>;

// Inventory Item Schema
export const CreateInventoryItemSchema = z.object({
  category: z.enum(["medicine", "equipment", "consumable"]),
  name: z.string().min(2, "Item name is required"),
  quantity: z.number().min(0),
  unit: z.string().min(1, "Unit is required (e.g. bottles, pcs, bags)"),
  expiryDate: z.string().optional().nullable(),
  reorderLevel: z.number().min(0).default(5),
  location: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateInventoryItemInput = z.infer<
  typeof CreateInventoryItemSchema
>;

// Expense Schema
export const CreateExpenseSchema = z.object({
  batchId: z.string().optional().nullable(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().positive("Amount in PKR must be positive"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  description: z.string().min(2, "Description is required"),
  receiptNo: z.string().optional(),
  paymentMethod: z
    .enum(["cash", "bank_transfer", "check", "other"])
    .default("cash"),
  paidTo: z.string().optional(),
});
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;

// Sale / Lifting Lots Schema
export const CreateSaleSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  shedId: z.string().min(1, "Shed ID is required"),
  lotNumber: z.number().int().positive().optional(),
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerPhone: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  totalLiveWeightKg: z.number().positive("Total live weight (kg) must be positive"),
  averageWeightKg: z.number().positive("Average weight (kg) must be positive").optional(),
  birdsSold: z.number().int().positive("Number of birds sold must be positive").optional(), // Computed or manual
  isManualBirdCountOverride: z.boolean().default(false),
  overrideReason: z.string().optional(),
  ratePerKg: z.number().positive("Rate per kg must be positive"), // Manually editable
  amountPaid: z.number().min(0).default(0),
  paymentStatus: z.enum(["paid", "partial", "pending"]).default("pending"),
  vehicleNo: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;

export const CreateBuyerPaymentSchema = z.object({
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerPhone: z.string().optional(),
  saleId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  amount: z.number().positive("Payment amount must be positive"),
  paymentMethod: z
    .enum(["cash", "bank_transfer", "check", "other"])
    .default("cash"),
  receiptNo: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateBuyerPaymentInput = z.infer<typeof CreateBuyerPaymentSchema>;

// Staff & Attendance Schema
export const CreateStaffSchema = z.object({
  name: z.string().min(2, "Staff name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  role: z.enum(["worker", "admin", "other"]).default("worker"),
  assignedShedId: z.string().optional().nullable(),
  dailyWage: z.number().positive("Daily wage in PKR must be positive"),
  status: z.enum(["active", "inactive"]).default("active"),
  joiningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Joining date format YYYY-MM-DD"),
  notes: z.string().optional(),
});
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;

export const RecordAttendanceSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  status: z.enum(["present", "absent", "half_day", "leave"]),
  dailyWageAmount: z.number().min(0).optional(),
  advanceDeduction: z.number().min(0).default(0),
  notes: z.string().optional(),
  clientUpdatedAt: z.string().optional(),
});
export type RecordAttendanceInput = z.infer<typeof RecordAttendanceSchema>;

export const CreateStaffAdvanceSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  amount: z.number().positive("Advance amount must be positive"),
  reason: z.string().optional(),
});
export type CreateStaffAdvanceInput = z.infer<typeof CreateStaffAdvanceSchema>;

// Historical CSV Register Import Schema
export const HistoricalRegisterRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format must be YYYY-MM-DD"),
  dayNumber: z.number().int().min(1, "Day number must be >= 1").optional(),
  openingFeedStockBags: z.number().min(0).default(0),
  feedUsedDayShiftBags: z.number().min(0).default(0),
  feedUsedNightShiftBags: z.number().min(0).default(0),
  feedReceivedBags: z.number().min(0).default(0),
  feedTransferredOutBags: z.number().min(0).default(0),
  closingFeedStockBags: z.number().min(0).optional(),
  openingBirds: z.number().int().min(0).optional(),
  mortalityDayShift: z.number().int().min(0).default(0),
  mortalityNightShift: z.number().int().min(0).default(0),
  culls: z.number().int().min(0).default(0),
  liftedBirds: z.number().int().min(0).default(0),
  customColumnES: z.number().optional().nullable(),
  feedRemarks: z.string().optional(),
});
export type HistoricalRegisterRowInput = z.infer<typeof HistoricalRegisterRowSchema>;

export const HistoricalRegisterImportSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  shedId: z.string().min(1, "Shed ID is required"),
  rows: z.array(HistoricalRegisterRowSchema).min(1, "At least one register row is required"),
});
export type HistoricalRegisterImportInput = z.infer<typeof HistoricalRegisterImportSchema>;

// Offline Sync Packet Schema
export const SyncItemSchema = z.object({
  clientMutationId: z.string().min(1, "Client mutation ID is required"),
  entityType: z.string().min(1, "Entity type is required"),
  action: z.enum(["CREATE", "UPDATE", "DELETE"]),
  payload: z.record(z.any()),
  clientTimestamp: z.string(),
});
export type SyncItemInput = z.infer<typeof SyncItemSchema>;

export const SyncPacketSchema = z.object({
  deviceId: z.string().min(1, "Device identifier is required"),
  userId: z.string().min(1, "User ID is required"),
  items: z.array(SyncItemSchema),
});
export type SyncPacketInput = z.infer<typeof SyncPacketSchema>;

// Farm Settings Schema
export const UpdateFarmSettingsSchema = z.object({
  farmName: z.string().min(2).optional(),
  location: z.string().optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  defaultFeedBagWeightKg: z.number().positive().optional(),
  currency: z.string().default("PKR"),
  defaultLanguage: z.enum(["en", "ur"]).optional(),
  customDailyColumn: z
    .object({
      enabled: z.boolean(),
      label: z.string().min(1),
    })
    .optional(),
  batchScope: z.enum(["per_shed", "multi_shed"]).optional(),
  alertThresholds: z
    .object({
      mortalitySpikePercentDaily: z.number().positive().optional(),
      mortalitySpikePercent3Day: z.number().positive().optional(),
      weeklyMortalityAlertPercent: z.number().positive().optional(),
      stockShortageAlert: z.boolean().optional(),
      missedShiftEntryAlert: z.boolean().optional(),
      lowFeedStockBags: z.number().int().positive().optional(),
      tempMinCelsius: z.number().optional(),
      tempMaxCelsius: z.number().optional(),
      medicineExpiryWarningDays: z.number().int().positive().optional(),
      paymentOverdueDays: z.number().int().positive().optional(),
    })
    .optional(),
});
export type UpdateFarmSettingsInput = z.infer<typeof UpdateFarmSettingsSchema>;
