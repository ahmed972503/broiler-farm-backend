import mongoose, { Schema, Document, Model } from "mongoose";
import {
  UserRole,
  ShedStatus,
  BatchStatus,
  LitterCondition,
  FeedType,
  VaccineRoute,
  TaskStatus,
  PaymentStatus,
  InventoryCategory,
  ExpenseCategory,
  PaymentMethod,
  StaffRole,
  AttendanceStatus,
  AlertType,
  AlertSeverity,
  AuditAction,
} from "@broiler/shared";

// 1. User
export interface IUser extends Document {
  username: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: UserRole;
  assignedShedId?: mongoose.Types.ObjectId | null;
  refreshToken?: string | null;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["admin", "worker"],
      default: "worker",
      required: true,
    },
    assignedShedId: { type: Schema.Types.ObjectId, ref: "Shed", default: null },
    refreshToken: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// 2. Shed
export interface IShed extends Document {
  name: string;
  shedNumber: number;
  capacity: number;
  status: ShedStatus;
  assignedWorkerId?: mongoose.Types.ObjectId | null;
  currentBatchId?: mongoose.Types.ObjectId | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShedSchema = new Schema<IShed>(
  {
    name: { type: String, required: true, trim: true },
    shedNumber: { type: Number, required: true, unique: true, min: 1, max: 20 },
    capacity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["empty", "active", "cleaning"],
      default: "empty",
    },
    assignedWorkerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    currentBatchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

// 3. Batch
export interface IBatch extends Document {
  batchNumber: string;
  shedId: mongoose.Types.ObjectId;
  chicksPlaced: number;
  placementDate: string;
  expectedCloseDate: string;
  supplier: string;
  breed: string;
  chickRate: number;
  initialCost: number;
  status: BatchStatus;
  closedAt?: string;
  closeSummary?: any;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    batchNumber: { type: String, required: true, unique: true, trim: true },
    shedId: {
      type: Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    chicksPlaced: { type: Number, required: true, min: 1 },
    placementDate: { type: String, required: true },
    expectedCloseDate: { type: String, required: true },
    supplier: { type: String, required: true },
    breed: { type: String, default: "Cobb 500" },
    chickRate: { type: Number, required: true, min: 0 },
    initialCost: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    closedAt: { type: String },
    closeSummary: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// 4. DailyRecord
export interface IDailyRecord extends Document {
  batchId: mongoose.Types.ObjectId;
  shedId: mongoose.Types.ObjectId;
  date: string;
  ageInDays: number;
  openingFeedStockBags: number;
  openingBirds?: number;
  feedUsedDayShiftBags: number;
  feedUsedNightShiftBags: number;
  feedUsed24hBags: number;
  feedUsedBags: number;
  feedUsedKg: number;
  feedReceivedBags: number;
  feedTransferredOutBags: number;
  cumulativeFeedBags: number;
  closingFeedStockBags: number;
  feedStockDiscrepancyBags: number;
  hasFeedStockShortage: boolean;
  feedRemarks?: string;
  mortalityDayShift: number;
  mortalityDayCause?: string;
  mortalityNightShift: number;
  mortalityNightCause?: string;
  mortality24h: number;
  mortalityCount: number;
  mortalityCause?: string;
  cumulativeMortality: number;
  closingBirds: number;
  culls: number;
  liftedBirds?: number;
  customColumnES?: number | null;
  feedType: FeedType;
  waterLiters: number;
  minTemp: number;
  maxTemp: number;
  litterCondition: LitterCondition;
  notes?: string;
  photoUrl?: string;
  isLocked: boolean;
  lockedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  shift?: "day" | "night" | "full";
  clientUpdatedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyRecordSchema = new Schema<IDailyRecord>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    shedId: {
      type: Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    ageInDays: { type: Number, required: true, min: 0 },
    openingFeedStockBags: { type: Number, default: 0, min: 0 },
    openingBirds: { type: Number },
    feedUsedDayShiftBags: { type: Number, default: 0, min: 0 },
    feedUsedNightShiftBags: { type: Number, default: 0, min: 0 },
    feedUsed24hBags: { type: Number, default: 0, min: 0 },
    feedUsedBags: { type: Number, required: true, min: 0, default: 0 },
    feedUsedKg: { type: Number, required: true, min: 0, default: 0 },
    feedReceivedBags: { type: Number, default: 0, min: 0 },
    feedTransferredOutBags: { type: Number, default: 0, min: 0 },
    cumulativeFeedBags: { type: Number, default: 0, min: 0 },
    closingFeedStockBags: { type: Number, default: 0 },
    feedStockDiscrepancyBags: { type: Number, default: 0 },
    hasFeedStockShortage: { type: Boolean, default: false },
    feedRemarks: { type: String, default: "" },
    mortalityDayShift: { type: Number, default: 0, min: 0 },
    mortalityDayCause: { type: String, default: "" },
    mortalityNightShift: { type: Number, default: 0, min: 0 },
    mortalityNightCause: { type: String, default: "" },
    mortality24h: { type: Number, default: 0, min: 0 },
    mortalityCount: { type: Number, required: true, min: 0, default: 0 },
    mortalityCause: { type: String, default: "" },
    cumulativeMortality: { type: Number, default: 0, min: 0 },
    closingBirds: { type: Number, default: 0, min: 0 },
    culls: { type: Number, required: true, min: 0, default: 0 },
    liftedBirds: { type: Number, default: 0, min: 0 },
    customColumnES: { type: Number, default: null },
    feedType: {
      type: String,
      enum: ["starter", "grower", "finisher"],
      required: true,
      default: "grower",
    },
    waterLiters: { type: Number, required: true, min: 0, default: 0 },
    minTemp: { type: Number, required: true, default: 24 },
    maxTemp: { type: Number, required: true, default: 30 },
    litterCondition: {
      type: String,
      enum: ["dry", "normal", "wet"],
      default: "normal",
    },
    notes: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    shift: { type: String, enum: ["day", "night", "full"], default: "full" },
    clientUpdatedAt: { type: String },
  },
  { timestamps: true },
);
DailyRecordSchema.index({ batchId: 1, date: 1 }, { unique: true });

// 5. WeightRecord
export interface IWeightRecord extends Document {
  batchId: mongoose.Types.ObjectId;
  shedId: mongoose.Types.ObjectId;
  date: string;
  ageInDays: number;
  sampleSize: number;
  averageWeightGrams: number;
  targetWeightGrams: number;
  deviationGrams: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  clientUpdatedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WeightRecordSchema = new Schema<IWeightRecord>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    shedId: {
      type: Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    ageInDays: { type: Number, required: true, min: 0 },
    sampleSize: { type: Number, required: true, min: 1 },
    averageWeightGrams: { type: Number, required: true, min: 1 },
    targetWeightGrams: { type: Number, required: true },
    deviationGrams: { type: Number, required: true },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientUpdatedAt: { type: String },
  },
  { timestamps: true },
);

// 6. VaccinationTemplate & Tasks
export interface IVaccinationTemplate extends Document {
  name: string;
  description?: string;
  isDefault: boolean;
  schedule: Array<{
    ageInDays: number;
    vaccineName: string;
    route: VaccineRoute;
    notes?: string;
    isMandatory: boolean;
  }>;
}

const VaccinationTemplateSchema = new Schema<IVaccinationTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    schedule: [
      {
        ageInDays: { type: Number, required: true },
        vaccineName: { type: String, required: true },
        route: { type: String, required: true },
        notes: { type: String, default: "" },
        isMandatory: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true },
);

export interface IVaccinationTask extends Document {
  batchId: mongoose.Types.ObjectId;
  shedId: mongoose.Types.ObjectId;
  ageInDays: number;
  dueDate: string;
  vaccineName: string;
  route: VaccineRoute;
  status: TaskStatus;
  completedAt?: string;
  completedBy?: mongoose.Types.ObjectId;
  notes?: string;
  clientUpdatedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VaccinationTaskSchema = new Schema<IVaccinationTask>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    shedId: {
      type: Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    ageInDays: { type: Number, required: true },
    dueDate: { type: String, required: true, index: true },
    vaccineName: { type: String, required: true },
    route: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "skipped"],
      default: "pending",
      index: true,
    },
    completedAt: { type: String },
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },
    clientUpdatedAt: { type: String },
  },
  { timestamps: true },
);

// 7. MedicineRecord & DailyMedicineSheet
export interface IMedicineRecord extends Document {
  batchId: mongoose.Types.ObjectId;
  shedId: mongoose.Types.ObjectId;
  date: string;
  medicineName: string;
  dosage: string;
  route: string;
  reason: string;
  withdrawalPeriodDays: number;
  withdrawalEndDate: string;
  administeredBy: string;
  quantity?: number;
  unit?: string;
  cost?: number;
  category?: string;
  isVaccine?: boolean;
  clientUpdatedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineRecordSchema = new Schema<IMedicineRecord>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    shedId: {
      type: Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    medicineName: { type: String, required: true },
    dosage: { type: String, default: "As directed" },
    route: { type: String, default: "drinking_water" },
    reason: { type: String, default: "General flock health / supplement" },
    withdrawalPeriodDays: { type: Number, default: 0 },
    withdrawalEndDate: { type: String, default: "" },
    administeredBy: { type: String, default: "Worker" },
    quantity: { type: Number },
    unit: { type: String, default: "" },
    cost: { type: Number, default: 0 },
    category: { type: String, default: "supplement" },
    isVaccine: { type: Boolean, default: false },
    clientUpdatedAt: { type: String },
  },
  { timestamps: true },
);

export interface IDailyMedicineSheet extends Document {
  batchId: mongoose.Types.ObjectId;
  shedId: mongoose.Types.ObjectId;
  date: string;
  items: Array<{
    name: string;
    category: string;
    isVaccine: boolean;
    dosage?: string;
    quantity?: number;
    unit?: string;
    cost?: number;
    route?: string;
    notes?: string;
  }>;
  recordedBy: mongoose.Types.ObjectId;
  clientUpdatedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyMedicineSheetSchema = new Schema<IDailyMedicineSheet>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    shedId: {
      type: Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true },
    items: [
      {
        name: { type: String, required: true },
        category: { type: String, default: "supplement" },
        isVaccine: { type: Boolean, default: false },
        dosage: { type: String, default: "" },
        quantity: { type: Number },
        unit: { type: String, default: "" },
        cost: { type: Number, default: 0 },
        route: { type: String, default: "drinking_water" },
        notes: { type: String, default: "" },
      },
    ],
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
    clientUpdatedAt: { type: String },
  },
  { timestamps: true },
);
DailyMedicineSheetSchema.index({ batchId: 1, date: 1 }, { unique: true });

// 8. Feed Models
export interface IFeedPurchase extends Document {
  supplier: string;
  date: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const FeedPurchaseSchema = new Schema<IFeedPurchase>(
  {
    supplier: { type: String, required: true },
    date: { type: String, required: true, index: true },
    invoiceNo: { type: String, default: "" },
    feedType: {
      type: String,
      enum: ["starter", "grower", "finisher"],
      required: true,
    },
    bags: { type: Number, required: true, min: 1 },
    bagWeightKg: { type: Number, required: true, default: 50 },
    totalKg: { type: Number, required: true },
    ratePerBag: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "pending"],
      default: "pending",
    },
    amountPaid: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export interface IFeedIssue extends Document {
  date: string;
  shedId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  feedType: FeedType;
  bags: number;
  bagWeightKg: number;
  totalKg: number;
  issuedTo?: string;
  issuedBy: mongoose.Types.ObjectId;
  notes?: string;
  clientUpdatedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedIssueSchema = new Schema<IFeedIssue>(
  {
    date: { type: String, required: true, index: true },
    shedId: {
      type: Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    feedType: {
      type: String,
      enum: ["starter", "grower", "finisher"],
      required: true,
    },
    bags: { type: Number, required: true, min: 0.1 },
    bagWeightKg: { type: Number, required: true, default: 50 },
    totalKg: { type: Number, required: true },
    issuedTo: { type: String, default: "" },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, default: "" },
    clientUpdatedAt: { type: String },
  },
  { timestamps: true },
);

export interface IFeedStock extends Document {
  feedType: FeedType;
  currentBags: number;
  currentKg: number;
  reorderThresholdBags: number;
  bagWeightKg: number;
  lastUpdated: Date;
}

const FeedStockSchema = new Schema<IFeedStock>(
  {
    feedType: {
      type: String,
      enum: ["starter", "grower", "finisher"],
      required: true,
      unique: true,
    },
    currentBags: { type: Number, default: 0 },
    currentKg: { type: Number, default: 0 },
    reorderThresholdBags: { type: Number, default: 20 },
    bagWeightKg: { type: Number, default: 50 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export interface IFeedTransfer extends Document {
  date: string;
  partyName: string;
  type: "transfer_in" | "transfer_out";
  brand: string;
  feedType: FeedType;
  bags: number;
  bagWeightKg: number;
  notes?: string;
  recordedBy: mongoose.Types.ObjectId;
  clientUpdatedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedTransferSchema = new Schema<IFeedTransfer>(
  {
    date: { type: String, required: true, index: true },
    partyName: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["transfer_in", "transfer_out"],
      required: true,
      index: true,
    },
    brand: { type: String, required: true },
    feedType: {
      type: String,
      enum: ["starter", "grower", "finisher"],
      required: true,
    },
    bags: { type: Number, required: true, min: 0.1 },
    bagWeightKg: { type: Number, required: true, default: 50.0 },
    notes: { type: String, default: "" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientUpdatedAt: { type: String },
  },
  { timestamps: true },
);

// 9. InventoryItem
export interface IInventoryItem extends Document {
  category: InventoryCategory;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  reorderLevel: number;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    category: {
      type: String,
      enum: ["medicine", "equipment", "consumable"],
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true },
    expiryDate: { type: String, default: null },
    reorderLevel: { type: Number, default: 5 },
    location: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

// 10. Expense
export interface IExpense extends Document {
  batchId?: mongoose.Types.ObjectId | null;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  receiptNo?: string;
  paymentMethod: PaymentMethod;
  paidTo?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "chicks",
        "feed",
        "medicine",
        "electricity",
        "labour",
        "fuel_generator",
        "transport",
        "maintenance",
        "misc",
      ],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true, index: true },
    description: { type: String, required: true },
    receiptNo: { type: String, default: "" },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "check", "other"],
      default: "cash",
    },
    paidTo: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// 11. Sale & BuyerPayment
export interface ISale extends Document {
  batchId: mongoose.Types.ObjectId;
  shedId: mongoose.Types.ObjectId;
  lotNumber: number;
  buyerName: string;
  buyerPhone?: string;
  date: string;
  birdsSold: number;
  isManualBirdCountOverride: boolean;
  overrideReason?: string;
  totalLiveWeightKg: number;
  averageWeightKg: number;
  ratePerKg: number;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  vehicleNo?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    shedId: {
      type: Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    lotNumber: { type: Number, default: 1 },
    buyerName: { type: String, required: true, index: true },
    buyerPhone: { type: String, default: "" },
    date: { type: String, required: true, index: true },
    birdsSold: { type: Number, required: true, min: 1 },
    isManualBirdCountOverride: { type: Boolean, default: false },
    overrideReason: { type: String, default: "" },
    totalLiveWeightKg: { type: Number, required: true, min: 0.1 },
    averageWeightKg: { type: Number, required: true },
    ratePerKg: { type: Number, required: true, min: 0 }, // Manually editable
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "pending"],
      default: "pending",
    },
    vehicleNo: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export interface IBuyerPayment extends Document {
  buyerName: string;
  buyerPhone?: string;
  saleId?: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  receiptNo?: string;
  notes?: string;
  receivedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BuyerPaymentSchema = new Schema<IBuyerPayment>(
  {
    buyerName: { type: String, required: true, index: true },
    buyerPhone: { type: String, default: "" },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    date: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "check", "other"],
      default: "cash",
    },
    receiptNo: { type: String, default: "" },
    notes: { type: String, default: "" },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// 12. Staff, Attendance & Advances
export interface IStaff extends Document {
  name: string;
  phone: string;
  role: StaffRole;
  assignedShedId?: mongoose.Types.ObjectId | null;
  dailyWage: number;
  status: "active" | "inactive";
  joiningDate: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    role: {
      type: String,
      enum: ["worker", "admin", "other"],
      default: "worker",
    },
    assignedShedId: { type: Schema.Types.ObjectId, ref: "Shed", default: null },
    dailyWage: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    joiningDate: { type: String, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export interface IAttendance extends Document {
  staffId: mongoose.Types.ObjectId;
  date: string;
  status: AttendanceStatus;
  dailyWageAmount: number;
  advanceDeduction: number;
  notes?: string;
  recordedBy: mongoose.Types.ObjectId;
  clientUpdatedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "half_day", "leave"],
      required: true,
    },
    dailyWageAmount: { type: Number, default: 0 },
    advanceDeduction: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientUpdatedAt: { type: String },
  },
  { timestamps: true },
);
AttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

export interface IStaffAdvance extends Document {
  staffId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  reason?: string;
  status: "pending" | "deducted";
  createdAt: Date;
  updatedAt: Date;
}

const StaffAdvanceSchema = new Schema<IStaffAdvance>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["pending", "deducted"], default: "pending" },
  },
  { timestamps: true },
);

// 13. Alert
export interface IAlert extends Document {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  shedId?: mongoose.Types.ObjectId;
  shedNumber?: number;
  batchId?: mongoose.Types.ObjectId;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>({
  type: {
    type: String,
    enum: [
      "mortality_spike",
      "weekly_mortality_alert",
      "feed_shortage_alert",
      "missed_daily_entry",
      "missed_shift_entry",
      "vaccine_due",
      "vaccine_overdue",
      "low_feed_stock",
      "medicine_near_expiry",
      "abnormal_temp",
      "pending_payment",
    ],
    required: true,
    index: true,
  },
  severity: {
    type: String,
    enum: ["info", "warning", "critical"],
    default: "info",
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  shedId: { type: Schema.Types.ObjectId, ref: "Shed" },
  shedNumber: { type: Number },
  batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
  isResolved: { type: Boolean, default: false, index: true },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now, index: true },
});

// 14. AuditLog
export interface IAuditLog extends Document {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: mongoose.Types.ObjectId;
  previousState?: any;
  newState?: any;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },
  action: {
    type: String,
    enum: ["CREATE", "UPDATE", "DELETE", "SYNC", "UNLOCK"],
    required: true,
  },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  previousState: { type: Schema.Types.Mixed, default: null },
  newState: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now },
});

// 15. FarmSettings
export interface IFarmSettings extends Document {
  farmName: string;
  location: string;
  ownerName: string;
  phone: string;
  totalSheds: number;
  defaultFeedBagWeightKg: number;
  currency: string;
  defaultLanguage: "en" | "ur";
  customDailyColumn: {
    enabled: boolean;
    label: string;
  };
  batchScope: "per_shed" | "multi_shed";
  alertThresholds: {
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
  };
}

const FarmSettingsSchema = new Schema<IFarmSettings>(
  {
    farmName: { type: String, default: "Al-Barakah Broiler Farm" },
    location: { type: String, default: "Okara, Punjab, Pakistan" },
    ownerName: { type: String, default: "Farm Owner" },
    phone: { type: String, default: "0300-1234567" },
    totalSheds: { type: Number, default: 5 },
    defaultFeedBagWeightKg: { type: Number, default: 50.0 },
    currency: { type: String, default: "PKR" },
    defaultLanguage: { type: String, enum: ["en", "ur"], default: "ur" },
    customDailyColumn: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: "E.S" },
    },
    batchScope: {
      type: String,
      enum: ["per_shed", "multi_shed"],
      default: "per_shed",
    },
    alertThresholds: {
      mortalitySpikePercentDaily: { type: Number, default: 1.0 },
      mortalitySpikePercent3Day: { type: Number, default: 2.0 },
      weeklyMortalityAlertPercent: { type: Number, default: 3.0 },
      stockShortageAlert: { type: Boolean, default: true },
      missedShiftEntryAlert: { type: Boolean, default: true },
      lowFeedStockBags: { type: Number, default: 20 },
      tempMinCelsius: { type: Number, default: 20.0 },
      tempMaxCelsius: { type: Number, default: 34.0 },
      medicineExpiryWarningDays: { type: Number, default: 30 },
      paymentOverdueDays: { type: Number, default: 14 },
    },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", UserSchema);
export const Shed = mongoose.model<IShed>("Shed", ShedSchema);
export const Batch = mongoose.model<IBatch>("Batch", BatchSchema);
export const DailyRecord = mongoose.model<IDailyRecord>(
  "DailyRecord",
  DailyRecordSchema,
);
export const WeightRecord = mongoose.model<IWeightRecord>(
  "WeightRecord",
  WeightRecordSchema,
);
export const VaccinationTemplate = mongoose.model<IVaccinationTemplate>(
  "VaccinationTemplate",
  VaccinationTemplateSchema,
);
export const VaccinationTask = mongoose.model<IVaccinationTask>(
  "VaccinationTask",
  VaccinationTaskSchema,
);
export const MedicineRecord = mongoose.model<IMedicineRecord>(
  "MedicineRecord",
  MedicineRecordSchema,
);
export const DailyMedicineSheet = mongoose.model<IDailyMedicineSheet>(
  "DailyMedicineSheet",
  DailyMedicineSheetSchema,
);
export const FeedPurchase = mongoose.model<IFeedPurchase>(
  "FeedPurchase",
  FeedPurchaseSchema,
);
export const FeedIssue = mongoose.model<IFeedIssue>(
  "FeedIssue",
  FeedIssueSchema,
);
export const FeedStock = mongoose.model<IFeedStock>(
  "FeedStock",
  FeedStockSchema,
);
export const FeedTransfer = mongoose.model<IFeedTransfer>(
  "FeedTransfer",
  FeedTransferSchema,
);
export const InventoryItem = mongoose.model<IInventoryItem>(
  "InventoryItem",
  InventoryItemSchema,
);
export const Expense = mongoose.model<IExpense>("Expense", ExpenseSchema);
export const Sale = mongoose.model<ISale>("Sale", SaleSchema);
export const BuyerPayment = mongoose.model<IBuyerPayment>(
  "BuyerPayment",
  BuyerPaymentSchema,
);
export const Staff = mongoose.model<IStaff>("Staff", StaffSchema);
export const Attendance = mongoose.model<IAttendance>(
  "Attendance",
  AttendanceSchema,
);
export const StaffAdvance = mongoose.model<IStaffAdvance>(
  "StaffAdvance",
  StaffAdvanceSchema,
);
export const Alert = mongoose.model<IAlert>("Alert", AlertSchema);
export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
export const FarmSettings = mongoose.model<IFarmSettings>(
  "FarmSettings",
  FarmSettingsSchema,
);
