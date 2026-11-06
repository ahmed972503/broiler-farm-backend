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
  // Opening stock & birds
  openingFeedStockBags: number;
  openingBirds?: number;
  // Shift-specific Feed (bags)
  feedUsedDayShiftBags: number;
  feedUsedNightShiftBags: number;
  feedUsed24hBags: number; // 24h feed total (Day + Night)
  feedUsedBags: number; // Backward compatibility alias
  feedUsedKg: number; // feedUsed24hBags * bagWeightKg
  feedReceivedBags: number; // Feed bags received today
  feedTransferredOutBags: number; // Feed bags lent / transferred out today
  cumulativeFeedBags: number; // Running cumulative feed in bags
  closingFeedStockBags: number; // Closing stock reported or calculated
  feedStockDiscrepancyBags: number; // closing - (opening - used + received - transferred)
  hasFeedStockShortage: boolean; // Flagged when discrepancy != 0
  feedRemarks?: string; // Remarks on Feed In/Out
  // Shift-specific Mortality
  mortalityDayShift: number;
  mortalityDayCause?: string;
  mortalityNightShift: number;
  mortalityNightCause?: string;
  mortality24h: number; // 24h mortality total (Day + Night)
  mortalityCount: number; // Backward compatibility alias
  mortalityCause?: string;
  cumulativeMortality: number; // Running cumulative mortality
  closingBirds: number; // openingBirds - 24h mortality - culls - lifted
  culls: number;
  liftedBirds?: number; // Birds lifted today (if partial catching)
  // Custom Daily Column ("E.S" unconfirmed paper column)
  customColumnES?: number;
  // Environment & Feed specs
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
  shift?: "day" | "night" | "full";
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
  quantity?: number;
  unit?: string;
  cost?: number;
  isVaccine?: boolean;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyMedicineItem {
  id?: string;
  name: string;
  category:
    | "water_medication"
    | "supplement"
    | "antibiotic"
    | "vitamin"
    | "acidifier"
    | "electrolyte"
    | "vaccine"
    | "other";
  isVaccine: boolean;
  dosage?: string;
  quantity?: number;
  unit?: string;
  cost?: number;
  route?: string;
  notes?: string;
}

export interface DailyMedicineSheet {
  id: string;
  batchId: string;
  shedId: string;
  date: string; // YYYY-MM-DD
  items: DailyMedicineItem[];
  recordedBy: string;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentStatus = "paid" | "partial" | "pending";

export interface FeedTransfer {
  id: string;
  date: string; // YYYY-MM-DD
  partyName: string; // Neighboring farm, person, or feed merchant
  type: "transfer_in" | "transfer_out"; // in = borrowed/received, out = lent/returned
  brand: string; // Star Feed, Chenab Feed, etc.
  feedType: FeedType;
  bags: number;
  bagWeightKg: number;
  notes?: string;
  recordedBy: string;
  clientUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedPartyLedger {
  partyName: string;
  totalBagsIn: number;
  totalBagsOut: number;
  netBalanceBags: number; // totalBagsOut - totalBagsIn (positive = they owe us, negative = we owe them)
  status: "they_owe_us" | "we_owe_them" | "settled";
  summaryText: string;
}

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
  lotNumber?: number; // Partial lifting lot number (Lot 1, Lot 2, etc.)
  buyerName: string;
  buyerPhone?: string;
  date: string; // YYYY-MM-DD
  birdsSold: number;
  isManualBirdCountOverride?: boolean;
  overrideReason?: string;
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

export interface WeeklyFlockSummaryRow {
  weekNumber: number; // 1 to 6
  ageDays: number; // 7, 14, 21, 28, 35, 42
  totalChicks: number; // Total chicks placed
  remainingChicks: number; // Remaining live chicks
  weeklyFeedBags: number; // Feed consumed during this specific week (bags)
  totalFeedBags: number; // Cumulative feed consumed up to this week (bags)
  weeklyMortality: number; // Mortality during this week
  totalMortality: number; // Cumulative mortality up to this week
  averageWeightGrams: number; // Sample average bird weight in grams
  totalWeightKg: number; // Remaining chicks * (averageWeightGrams / 1000)
  trueFcr: number; // TRUE FCR = total feed (kg) / total live weight (kg)
  farmMethodFcr: number; // Farm legacy method = total live weight (kg) / total feed (bags)
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
  | "weekly_mortality_alert"
  | "feed_shortage_alert"
  | "missed_daily_entry"
  | "missed_shift_entry"
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
  weeklyMortalityAlertPercent: number;
  stockShortageAlert: boolean;
  missedShiftEntryAlert: boolean;
  lowFeedStockBags: number;
  tempMinCelsius: number;
  tempMaxCelsius: number;
  medicineExpiryWarningDays: number;
  paymentOverdueDays: number;
}

export interface CustomDailyColumnConfig {
  enabled: boolean;
  label: string; // default "E.S"
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
  customDailyColumn: CustomDailyColumnConfig;
  batchScope: "per_shed" | "multi_shed";
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
  | "DAILY_MEDICINE"
  | "FEED_ISSUE"
  | "FEED_TRANSFER"
  | "EXPENSE"
  | "ATTENDANCE"
  | "SALE";

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
