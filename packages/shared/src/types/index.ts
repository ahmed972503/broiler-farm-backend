/**
 * Core Domain Types for Broiler Farm Management System
 */

export type UserRole = "admin" | "worker";

export interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: UserRole;
  assignedShedId?: string | null;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ShedStatus = "empty" | "active" | "cleaning";

export interface Shed {
  id: string;
  name: string;
  shedNumber: number; // 1 to 5
  capacity: number;
  status: ShedStatus;
  assignedWorkerId?: string | null;
  assignedWorkerName?: string | null;
  currentBatchId?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BatchStatus = "active" | "closed";

export interface BatchCloseSummary {
  closedAt: string;
  finalAgeDays: number;
  birdsPlaced: number;
  birdsRemaining: number;
  totalMortality: number;
  mortalityRatePercent: number;
  totalCulls: number;
  totalBirdsSold: number;
  totalLiveWeightSoldKg: number;
  averageLiveWeightSoldKg: number;
  totalFeedConsumedKg: number;
  fcr: number;
  totalChickCost: number;
  totalFeedCost: number;
  totalMedicineCost: number;
  totalOtherExpenses: number;
  totalBatchCost: number;
  costPerKgSold: number;
  totalSalesRevenue: number;
  netProfit: number;
  livabilityPercent: number;
  epef: number;
  notes?: string;
}

export interface Batch {
  id: string;
  batchNumber: string; // e.g. "FLOCK-S1-2026-01"
  shedId: string;
  shedName?: string;
  chicksPlaced: number;
  placementDate: string; // YYYY-MM-DD
  expectedCloseDate: string; // YYYY-MM-DD
  supplier: string;
  breed: string; // Cobb 500, Ross 308, etc.
  chickRate: number; // Rate per chick in PKR
  initialCost: number; // chicksPlaced * chickRate
  status: BatchStatus;
  closedAt?: string;
  closeSummary?: BatchCloseSummary;
  createdAt?: string;
  updatedAt?: string;
}

export type LitterCondition = "dry" | "normal" | "wet";
export type FeedType = "starter" | "grower" | "finisher";

export interface DailyRecord {
  id: string;
  batchId: string;
  shedId: string;
  date: string; // YYYY-MM-DD
  ageInDays: number;
  mortalityCount: number;
  mortalityCause?: string;
  culls: number;
  feedUsedBags: number;
  feedUsedKg: number;
  feedType: FeedType;
  waterLiters: number;
  minTemp: number; // Celsius
  maxTemp: number; // Celsius
  litterCondition: LitterCondition;
  notes?: string;
  photoUrl?: string;
  isLocked: boolean;
  lockedAt?: string;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeightRecord {
  id: string;
  batchId: string;
  shedId: string;
  date: string; // YYYY-MM-DD
  ageInDays: number;
  sampleSize: number; // Number of birds weighed in sample
  averageWeightGrams: number;
  targetWeightGrams: number;
  deviationGrams: number;
  notes?: string;
  createdBy: string;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type VaccineRoute =
  "drinking_water" | "eye_drop" | "spray" | "injection_sc" | "injection_im";

export type TaskStatus = "pending" | "completed" | "skipped";

export interface VaccinationScheduleItem {
  ageInDays: number;
  vaccineName: string;
  route: VaccineRoute;
  notes?: string;
  isMandatory: boolean;
}

export interface VaccinationTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  schedule: VaccinationScheduleItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VaccinationTask {
  id: string;
  batchId: string;
  shedId: string;
  ageInDays: number;
  dueDate: string; // YYYY-MM-DD
  vaccineName: string;
  route: VaccineRoute;
  status: TaskStatus;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  notes?: string;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicineRecord {
  id: string;
  batchId: string;
  shedId: string;
  date: string; // YYYY-MM-DD
  medicineName: string;
  dosage: string;
  route: string;
  reason: string;
  withdrawalPeriodDays: number;
  withdrawalEndDate: string; // YYYY-MM-DD
  administeredBy: string;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentStatus = "paid" | "partial" | "pending";

export interface FeedPurchase {
  id: string;
  supplier: string;
  date: string; // YYYY-MM-DD
  invoiceNo?: string;
  feedType: FeedType;
  bags: number;
  bagWeightKg: number;
  totalKg: number;
  ratePerBag: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  balanceAmount: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedIssue {
  id: string;
  date: string; // YYYY-MM-DD
  shedId: string;
  batchId: string;
  feedType: FeedType;
  bags: number;
  bagWeightKg: number;
  totalKg: number;
  issuedTo?: string;
  issuedBy: string;
  notes?: string;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedStockItem {
  feedType: FeedType;
  currentBags: number;
  currentKg: number;
  reorderThresholdBags: number;
  bagWeightKg: number;
  lastUpdated: string;
}

export type InventoryCategory = "medicine" | "equipment" | "consumable";

export interface InventoryItem {
  id: string;
  category: InventoryCategory;
  name: string;
  quantity: number;
  unit: string; // bottles, vials, bags, pieces, kg, etc.
  expiryDate?: string; // YYYY-MM-DD
  reorderLevel: number;
  location?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseCategory =
  | "chicks"
  | "feed"
  | "medicine"
  | "electricity"
  | "labour"
  | "fuel_generator"
  | "transport"
  | "maintenance"
  | "misc";

export type PaymentMethod = "cash" | "bank_transfer" | "check" | "other";

export interface Expense {
  id: string;
  batchId?: string | null; // null means farm general overhead
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  receiptNo?: string;
  paymentMethod: PaymentMethod;
  paidTo?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sale {
  id: string;
  batchId: string;
  shedId: string;
  buyerName: string;
  buyerPhone?: string;
  date: string; // YYYY-MM-DD
  birdsSold: number;
  totalLiveWeightKg: number;
  averageWeightKg: number;
  ratePerKg: number; // Manually editable
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  vehicleNo?: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BuyerPayment {
  id: string;
  buyerName: string;
  buyerPhone?: string;
  saleId?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: PaymentMethod;
  receiptNo?: string;
  notes?: string;
  receivedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StaffRole = "worker" | "admin" | "other";
export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

export interface Staff {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  assignedShedId?: string | null;
  dailyWage: number;
  status: "active" | "inactive";
  joiningDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  staffId: string;
  staffName?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  dailyWageAmount: number;
  advanceDeduction: number;
  notes?: string;
  recordedBy: string;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffAdvance {
  id: string;
  staffId: string;
  staffName?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  reason?: string;
  status: "pending" | "deducted";
  createdAt?: string;
  updatedAt?: string;
}

export type AlertType =
  | "mortality_spike"
  | "missed_daily_entry"
  | "vaccine_due"
  | "vaccine_overdue"
  | "low_feed_stock"
  | "medicine_near_expiry"
  | "abnormal_temp"
  | "pending_payment";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  shedId?: string;
  shedNumber?: number;
  batchId?: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface AlertThresholds {
  mortalitySpikePercentDaily: number;
  mortalitySpikePercent3Day: number;
  lowFeedStockBags: number;
  tempMinCelsius: number;
  tempMaxCelsius: number;
  medicineExpiryWarningDays: number;
  paymentOverdueDays: number;
}

export interface FarmSettings {
  farmName: string;
  location: string;
  ownerName: string;
  phone: string;
  totalSheds: number;
  defaultFeedBagWeightKg: number;
  currency: string;
  defaultLanguage: "en" | "ur";
  alertThresholds: AlertThresholds;
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "SYNC" | "UNLOCK";

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  previousState?: any;
  newState?: any;
  timestamp: string;
}

export type SyncAction = "CREATE" | "UPDATE" | "DELETE";
export type SyncEntity =
  | "DAILY_RECORD"
  | "WEIGHT_RECORD"
  | "VACCINATION_TASK"
  | "MEDICINE_RECORD"
  | "FEED_ISSUE"
  | "EXPENSE"
  | "ATTENDANCE";

export interface SyncItem {
  clientMutationId: string;
  entityType: SyncEntity;
  action: SyncAction;
  payload: any;
  clientTimestamp: string;
}

export interface SyncPacket {
  deviceId: string;
  userId: string;
  items: SyncItem[];
}

export interface SyncItemResult {
  clientMutationId: string;
  serverId?: string;
  status: "synced" | "conflict" | "error" | "duplicate";
  message?: string;
}

export interface SyncResponse {
  success: boolean;
  processedCount: number;
  results: SyncItemResult[];
  serverTimestamp: string;
}

export interface ShedDashboardCard {
  shedId: string;
  shedName: string;
  shedNumber: number;
  status: ShedStatus;
  workerName?: string;
  currentBatch: {
    batchId: string;
    batchNumber: string;
    ageInDays: number;
    chicksPlaced: number;
    birdsRemaining: number;
    cumulativeMortality: number;
    mortalityPercent: number;
    feedConsumedTodayKg: number;
    waterConsumedTodayLiters: number;
    latestAvgWeightGrams?: number;
    fcrEstimate?: number;
    lastEntryTime?: string;
    hasEntryToday: boolean;
    missingEntryWarning: boolean;
  } | null;
}
