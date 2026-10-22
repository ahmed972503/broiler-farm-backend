import {
  TARGET_WEIGHTS_BY_DAY,
  DEFAULT_FEED_BAG_WEIGHT_KG,
} from "../constants";

/**
 * Utility to round numbers cleanly to specified decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates current remaining birds in a flock
 * Birds remaining = placed - cumulative mortality - culls - birds sold
 */
export function calculateBirdsRemaining(
  placed: number,
  cumulativeMortality: number = 0,
  culls: number = 0,
  birdsSold: number = 0,
): number {
  const safePlaced = Math.max(0, Math.floor(placed || 0));
  const safeMortality = Math.max(0, Math.floor(cumulativeMortality || 0));
  const safeCulls = Math.max(0, Math.floor(culls || 0));
  const safeSold = Math.max(0, Math.floor(birdsSold || 0));

  const remaining = safePlaced - safeMortality - safeCulls - safeSold;
  return Math.max(0, remaining);
}

/**
 * Mortality % = (placed - birds remaining) / placed * 100
 * Or: (cumulativeMortality / placed) * 100
 */
export function calculateMortalityPercent(
  placed: number,
  cumulativeMortalityOrRemaining: number,
  isRemainingBirdCount: boolean = true,
): number {
  if (!placed || placed <= 0) return 0;

  let deadCount = 0;
  if (isRemainingBirdCount) {
    deadCount = Math.max(0, placed - cumulativeMortalityOrRemaining);
  } else {
    deadCount = Math.max(0, cumulativeMortalityOrRemaining);
  }

  const percent = (deadCount / placed) * 100;
  return roundTo(Math.min(100, Math.max(0, percent)), 2);
}

/**
 * Single day mortality percentage relative to flock count at start of day
 */
export function calculateDailyMortalityPercent(
  dayMortality: number,
  birdsStartOfDay: number,
): number {
  if (
    !birdsStartOfDay ||
    birdsStartOfDay <= 0 ||
    !dayMortality ||
    dayMortality <= 0
  ) {
    return 0;
  }
  const percent = (dayMortality / birdsStartOfDay) * 100;
  return roundTo(percent, 2);
}

/**
 * FCR (Feed Conversion Ratio) = total feed consumed (kg) / total live weight (kg)
 */
export function calculateFCR(
  totalFeedConsumedKg: number,
  totalLiveWeightKg: number,
): number {
  if (
    !totalFeedConsumedKg ||
    totalFeedConsumedKg <= 0 ||
    !totalLiveWeightKg ||
    totalLiveWeightKg <= 0
  ) {
    return 0;
  }
  const fcr = totalFeedConsumedKg / totalLiveWeightKg;
  return roundTo(fcr, 3);
}

/**
 * Cost per kg = total batch cost / total live weight sold (kg)
 */
export function calculateCostPerKg(
  totalBatchCost: number,
  totalLiveWeightSoldKg: number,
): number {
  if (
    !totalBatchCost ||
    totalBatchCost <= 0 ||
    !totalLiveWeightSoldKg ||
    totalLiveWeightSoldKg <= 0
  ) {
    return 0;
  }
  const costPerKg = totalBatchCost / totalLiveWeightSoldKg;
  return roundTo(costPerKg, 2);
}

/**
 * Net Profit = total sales revenue - total batch expenses
 */
export function calculateBatchProfit(
  totalSalesRevenue: number,
  totalBatchCost: number,
): number {
  const rev = Number(totalSalesRevenue) || 0;
  const cost = Number(totalBatchCost) || 0;
  return roundTo(rev - cost, 2);
}

/**
 * Average Daily Gain (ADG) in grams/day
 * ADG = (currentWeightGrams - initialWeightGrams) / ageInDays
 */
export function calculateAverageDailyGain(
  currentWeightGrams: number,
  initialWeightGrams: number = 42,
  ageInDays: number,
): number {
  if (!ageInDays || ageInDays <= 0 || currentWeightGrams <= 0) {
    return 0;
  }
  const gain = (currentWeightGrams - initialWeightGrams) / ageInDays;
  return roundTo(Math.max(0, gain), 2);
}

/**
 * Livability % = (birds remaining + birds sold) / placed * 100
 */
export function calculateLivabilityPercent(
  placed: number,
  birdsRemaining: number,
  birdsSold: number = 0,
): number {
  if (!placed || placed <= 0) return 0;
  const surviving = Math.max(0, (birdsRemaining || 0) + (birdsSold || 0));
  const percent = (surviving / placed) * 100;
  return roundTo(Math.min(100, Math.max(0, percent)), 2);
}

/**
 * European Production Efficiency Factor (EPEF / EEF):
 * EPEF = (Livability % * Average Weight in kg) / (Age in Days * FCR) * 100
 */
export function calculateEPEF(
  livabilityPercent: number,
  averageLiveWeightKg: number,
  ageInDays: number,
  fcr: number,
): number {
  if (
    !ageInDays ||
    ageInDays <= 0 ||
    !fcr ||
    fcr <= 0 ||
    averageLiveWeightKg <= 0 ||
    livabilityPercent <= 0
  ) {
    return 0;
  }
  const numerator = livabilityPercent * averageLiveWeightKg;
  const denominator = ageInDays * fcr;
  const epef = (numerator / denominator) * 100;
  return roundTo(Math.max(0, epef), 1);
}

/**
 * Convert feed bags to kilograms
 */
export function bagsToKg(
  bags: number,
  bagWeightKg: number = DEFAULT_FEED_BAG_WEIGHT_KG,
): number {
  const safeBags = Math.max(0, Number(bags) || 0);
  const safeWeight = Math.max(
    0.1,
    Number(bagWeightKg) || DEFAULT_FEED_BAG_WEIGHT_KG,
  );
  return roundTo(safeBags * safeWeight, 2);
}

/**
 * Convert kilograms to feed bags
 */
export function kgToBags(
  kg: number,
  bagWeightKg: number = DEFAULT_FEED_BAG_WEIGHT_KG,
): number {
  const safeKg = Math.max(0, Number(kg) || 0);
  const safeWeight = Math.max(
    0.1,
    Number(bagWeightKg) || DEFAULT_FEED_BAG_WEIGHT_KG,
  );
  return roundTo(safeKg / safeWeight, 2);
}

/**
 * Estimate live biomass (kg) of remaining flock
 */
export function calculateEstimatedLiveWeightKg(
  birdsCount: number,
  averageWeightGrams: number,
): number {
  if (
    !birdsCount ||
    birdsCount <= 0 ||
    !averageWeightGrams ||
    averageWeightGrams <= 0
  ) {
    return 0;
  }
  return roundTo((birdsCount * averageWeightGrams) / 1000, 2);
}

/**
 * Compares actual sample weight with Cobb/Ross target growth curve
 */
export function compareWithTargetWeight(
  ageInDays: number,
  actualWeightGrams: number,
): {
  targetGrams: number;
  deviationGrams: number;
  deviationPercent: number;
  performanceStatus: "above_target" | "on_target" | "below_target";
} {
  const clampedAge = Math.min(42, Math.max(0, Math.floor(ageInDays || 0)));
  const targetGrams = TARGET_WEIGHTS_BY_DAY[clampedAge] || 42;
  const deviationGrams = roundTo(actualWeightGrams - targetGrams, 1);
  const deviationPercent =
    targetGrams > 0 ? roundTo((deviationGrams / targetGrams) * 100, 1) : 0;

  let performanceStatus: "above_target" | "on_target" | "below_target" =
    "on_target";
  if (deviationPercent > 5.0) {
    performanceStatus = "above_target";
  } else if (deviationPercent < -5.0) {
    performanceStatus = "below_target";
  }

  return {
    targetGrams,
    deviationGrams,
    deviationPercent,
    performanceStatus,
  };
}

/**
 * Calculates buyer ledger balance
 */
export function calculateBuyerBalance(
  totalSaleAmount: number,
  totalPaymentsReceived: number,
): {
  totalSaleAmount: number;
  totalPaymentsReceived: number;
  balanceAmount: number;
} {
  const billed = Math.max(0, Number(totalSaleAmount) || 0);
  const paid = Math.max(0, Number(totalPaymentsReceived) || 0);
  const balance = roundTo(billed - paid, 2);
  return {
    totalSaleAmount: billed,
    totalPaymentsReceived: paid,
    balanceAmount: balance,
  };
}

/**
 * Calculates staff wage breakdown for attendance
 */
export function calculateStaffWage(
  dailyWage: number,
  presentDays: number,
  halfDays: number = 0,
  advanceDeduction: number = 0,
): {
  grossWage: number;
  advanceDeductions: number;
  netPayable: number;
} {
  const safeWage = Math.max(0, Number(dailyWage) || 0);
  const safePresent = Math.max(0, Number(presentDays) || 0);
  const safeHalf = Math.max(0, Number(halfDays) || 0);
  const safeAdvance = Math.max(0, Number(advanceDeduction) || 0);

  const effectiveDays = safePresent + safeHalf * 0.5;
  const grossWage = roundTo(effectiveDays * safeWage, 2);
  const netPayable = roundTo(Math.max(0, grossWage - safeAdvance), 2);

  return {
    grossWage,
    advanceDeductions: safeAdvance,
    netPayable,
  };
}
