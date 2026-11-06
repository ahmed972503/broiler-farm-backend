import {
  TARGET_WEIGHTS_BY_DAY,
  DEFAULT_FEED_BAG_WEIGHT_KG,
} from "../constants";
import { WeeklyFlockSummaryRow, FeedPartyLedger } from "../types";

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

/**
 * Computes 24h feed, cumulative feed, closing stock, stock reconciliation,
 * and 24h mortality, cumulative mortality, and closing birds.
 */
export function calculateDailyRecordSummary(params: {
  openingFeedStockBags: number;
  feedUsedDayShiftBags: number;
  feedUsedNightShiftBags: number;
  feedReceivedBags?: number;
  feedTransferredOutBags?: number;
  previousCumulativeFeedBags?: number;
  reportedClosingFeedStockBags?: number;
  bagWeightKg?: number;
  openingBirds: number;
  mortalityDayShift: number;
  mortalityNightShift: number;
  previousCumulativeMortality?: number;
  culls?: number;
  liftedBirds?: number;
}): {
  feedUsed24hBags: number;
  feedUsedKg: number;
  cumulativeFeedBags: number;
  expectedClosingFeedStockBags: number;
  closingFeedStockBags: number;
  feedStockDiscrepancyBags: number;
  hasFeedStockShortage: boolean;
  mortality24h: number;
  cumulativeMortality: number;
  closingBirds: number;
} {
  const bagWeight = params.bagWeightKg || DEFAULT_FEED_BAG_WEIGHT_KG;
  const feedDay = Math.max(0, Number(params.feedUsedDayShiftBags) || 0);
  const feedNight = Math.max(0, Number(params.feedUsedNightShiftBags) || 0);
  const feedUsed24hBags = roundTo(feedDay + feedNight, 2);
  const feedUsedKg = bagsToKg(feedUsed24hBags, bagWeight);

  const prevFeed = Math.max(0, Number(params.previousCumulativeFeedBags) || 0);
  const cumulativeFeedBags = roundTo(prevFeed + feedUsed24hBags, 2);

  const openingStock = Math.max(0, Number(params.openingFeedStockBags) || 0);
  const received = Math.max(0, Number(params.feedReceivedBags) || 0);
  const transferredOut = Math.max(
    0,
    Number(params.feedTransferredOutBags) || 0,
  );

  const expectedClosingFeedStockBags = roundTo(
    openingStock - feedUsed24hBags + received - transferredOut,
    2,
  );

  const closingFeedStockBags =
    params.reportedClosingFeedStockBags !== undefined &&
    params.reportedClosingFeedStockBags !== null
      ? roundTo(Number(params.reportedClosingFeedStockBags), 2)
      : expectedClosingFeedStockBags;

  const feedStockDiscrepancyBags = roundTo(
    closingFeedStockBags - expectedClosingFeedStockBags,
    2,
  );
  // Shortage flagged if closing stock is less than expected by more than 0.01 bags
  const hasFeedStockShortage = feedStockDiscrepancyBags < -0.01;

  // Mortality
  const mortDay = Math.max(0, Math.floor(params.mortalityDayShift || 0));
  const mortNight = Math.max(0, Math.floor(params.mortalityNightShift || 0));
  const mortality24h = mortDay + mortNight;

  const prevMort = Math.max(
    0,
    Math.floor(params.previousCumulativeMortality || 0),
  );
  const cumulativeMortality = prevMort + mortality24h;

  const openingBirds = Math.max(0, Math.floor(params.openingBirds || 0));
  const culls = Math.max(0, Math.floor(params.culls || 0));
  const lifted = Math.max(0, Math.floor(params.liftedBirds || 0));

  const closingBirds = Math.max(
    0,
    openingBirds - mortality24h - culls - lifted,
  );

  return {
    feedUsed24hBags,
    feedUsedKg,
    cumulativeFeedBags,
    expectedClosingFeedStockBags,
    closingFeedStockBags,
    feedStockDiscrepancyBags,
    hasFeedStockShortage,
    mortality24h,
    cumulativeMortality,
    closingBirds,
  };
}

/**
 * Calculates bird count from total live weight (kg) and average weight (kg)
 * Bird count = total weight (kg) / average bird weight (kg)
 * e.g. 3475 kg / 2.25 kg = 1544.44 -> 1544 birds
 * Supports optional manual override with reason
 */
export function calculateLiftingBirds(
  totalWeightKg: number,
  averageWeightKg: number,
  manualOverride?: number | null,
  overrideReason?: string,
): {
  birds: number;
  calculatedBirds: number;
  isOverridden: boolean;
  overrideReason?: string;
} {
  const safeTotalWeight = Math.max(0, Number(totalWeightKg) || 0);
  const safeAvgWeight = Math.max(0, Number(averageWeightKg) || 0);

  const calculatedBirds =
    safeAvgWeight > 0 ? Math.round(safeTotalWeight / safeAvgWeight) : 0;

  const isOverridden =
    manualOverride !== undefined &&
    manualOverride !== null &&
    manualOverride !== calculatedBirds;

  const birds = isOverridden
    ? Math.max(0, Math.floor(Number(manualOverride) || 0))
    : calculatedBirds;

  return {
    birds,
    calculatedBirds,
    isOverridden,
    overrideReason: isOverridden ? overrideReason || "" : undefined,
  };
}

/**
 * Consistency check for flock lifting:
 * Placed - cumulative mortality - lifted must equal birds remaining (within tolerance)
 */
export function reconcileLiftingConsistency(
  placed: number,
  cumulativeMortality: number,
  totalLiftedBirds: number,
  reportedRemainingBirds: number,
  tolerance: number = 10,
): {
  isConsistent: boolean;
  expectedRemaining: number;
  discrepancy: number;
  warning?: string;
} {
  const safePlaced = Math.max(0, Math.floor(placed || 0));
  const safeMortality = Math.max(0, Math.floor(cumulativeMortality || 0));
  const safeLifted = Math.max(0, Math.floor(totalLiftedBirds || 0));
  const safeReported = Math.max(0, Math.floor(reportedRemainingBirds || 0));

  const expectedRemaining = Math.max(
    0,
    safePlaced - safeMortality - safeLifted,
  );
  const discrepancy = safeReported - expectedRemaining;
  const isConsistent = Math.abs(discrepancy) <= tolerance;

  let warning: string | undefined;
  if (!isConsistent) {
    warning = `Lifting discrepancy detected: Placed (${safePlaced}) - Mortality (${safeMortality}) - Lifted (${safeLifted}) = ${expectedRemaining} expected birds, but reported remaining is ${safeReported} (discrepancy of ${discrepancy > 0 ? "+" : ""}${discrepancy} birds, exceeds ${tolerance} tolerance).`;
  }

  return {
    isConsistent,
    expectedRemaining,
    discrepancy,
    warning,
  };
}

/**
 * True FCR = total feed consumed (kg) / total live weight (kg)
 * bagWeightKg defaults to 50 kg
 */
export function calculateTrueFCR(
  totalFeedBagsOrKg: number,
  totalLiveWeightKg: number,
  isBags: boolean = true,
  bagWeightKg: number = DEFAULT_FEED_BAG_WEIGHT_KG,
): number {
  const totalFeedKg = isBags
    ? bagsToKg(totalFeedBagsOrKg, bagWeightKg)
    : Number(totalFeedBagsOrKg) || 0;

  if (
    !totalFeedKg ||
    totalFeedKg <= 0 ||
    !totalLiveWeightKg ||
    totalLiveWeightKg <= 0
  ) {
    return 0;
  }
  return roundTo(totalFeedKg / totalLiveWeightKg, 2);
}

/**
 * Farm's Legacy Metric ("Farm method") = total live weight (kg) / total feed (bags)
 * e.g. 3948.8 kg / 63 bags = 62.68 kg/bag
 * Clearly distinguished from True FCR.
 */
export function calculateFarmMethodMetric(
  totalLiveWeightKg: number,
  totalFeedBags: number,
): number {
  const safeWeight = Number(totalLiveWeightKg) || 0;
  const safeBags = Number(totalFeedBags) || 0;

  if (safeWeight <= 0 || safeBags <= 0) {
    return 0;
  }
  return roundTo(safeWeight / safeBags, 2);
}

/**
 * Calculates a single row for the Farm's Weekly Flock Summary (weeks 1 to 6)
 * Weekly feed = total feed (current week) - total feed (previous week)
 * Weekly mortality = total mortality (current week) - total mortality (previous week)
 * Total weight = remaining chicks * average weight (grams) / 1000
 * TRUE FCR = total feed (kg) / total weight (kg)
 * Farm method = total weight (kg) / total feed (bags)
 */
export function calculateWeeklyFlockSummaryRow(params: {
  weekNumber: number;
  ageDays: number;
  totalChicksPlaced: number;
  currentCumulativeFeedBags: number;
  previousCumulativeFeedBags: number;
  currentCumulativeMortality: number;
  previousCumulativeMortality: number;
  averageWeightGrams: number;
  totalLiftedBirds?: number;
  bagWeightKg?: number;
}): WeeklyFlockSummaryRow {
  const bagWeight = params.bagWeightKg || DEFAULT_FEED_BAG_WEIGHT_KG;
  const totalChicks = Math.max(0, Math.floor(params.totalChicksPlaced || 0));
  const lifted = Math.max(0, Math.floor(params.totalLiftedBirds || 0));
  const totalMortality = Math.max(
    0,
    Math.floor(params.currentCumulativeMortality || 0),
  );
  const prevMortality = Math.max(
    0,
    Math.floor(params.previousCumulativeMortality || 0),
  );

  const remainingChicks = Math.max(0, totalChicks - totalMortality - lifted);
  const weeklyMortality = Math.max(0, totalMortality - prevMortality);

  const totalFeedBags = roundTo(
    Math.max(0, Number(params.currentCumulativeFeedBags) || 0),
    2,
  );
  const prevFeedBags = roundTo(
    Math.max(0, Number(params.previousCumulativeFeedBags) || 0),
    2,
  );
  // Important: weekly feed is ALWAYS the difference of cumulative totals
  const weeklyFeedBags = roundTo(
    Math.max(0, totalFeedBags - prevFeedBags),
    2,
  );

  const avgWeightGrams = Math.max(
    0,
    Number(params.averageWeightGrams) || 0,
  );
  const totalWeightKg = roundTo((remainingChicks * avgWeightGrams) / 1000, 2);

  const trueFcr = calculateTrueFCR(totalFeedBags, totalWeightKg, true, bagWeight);
  const farmMethodFcr = calculateFarmMethodMetric(totalWeightKg, totalFeedBags);

  return {
    weekNumber: params.weekNumber,
    ageDays: params.ageDays,
    totalChicks,
    remainingChicks,
    weeklyFeedBags,
    totalFeedBags,
    weeklyMortality,
    totalMortality,
    averageWeightGrams: avgWeightGrams,
    totalWeightKg,
    trueFcr,
    farmMethodFcr,
  };
}

/**
 * Calculates running Feed Party Ledger in bags (who owes whom)
 */
export function calculateFeedPartyLedger(
  transfers: Array<{
    partyName: string;
    type: "transfer_in" | "transfer_out";
    bags: number;
  }>,
): FeedPartyLedger[] {
  const partyMap: Record<string, { totalIn: number; totalOut: number }> = {};

  for (const t of transfers) {
    const party = t.partyName?.trim() || "Unknown Party";
    if (!partyMap[party]) {
      partyMap[party] = { totalIn: 0, totalOut: 0 };
    }
    const bags = Math.max(0, Number(t.bags) || 0);
    if (t.type === "transfer_in") {
      partyMap[party].totalIn += bags;
    } else {
      partyMap[party].totalOut += bags;
    }
  }

  const result: FeedPartyLedger[] = [];

  for (const [partyName, data] of Object.entries(partyMap)) {
    const totalBagsIn = roundTo(data.totalIn, 2);
    const totalBagsOut = roundTo(data.totalOut, 2);
    // netBalanceBags = out - in.
    // If out > in (we lent more to them), they owe us.
    // If in > out (we borrowed more from them), we owe them.
    const netBalanceBags = roundTo(totalBagsOut - totalBagsIn, 2);

    let status: "they_owe_us" | "we_owe_them" | "settled" = "settled";
    let summaryText = `All feed accounts settled (0 bags)`;

    if (netBalanceBags > 0) {
      status = "they_owe_us";
      summaryText = `${partyName} owes us ${netBalanceBags} bags`;
    } else if (netBalanceBags < 0) {
      status = "we_owe_them";
      summaryText = `We owe ${partyName} ${Math.abs(netBalanceBags)} bags`;
    }

    result.push({
      partyName,
      totalBagsIn,
      totalBagsOut,
      netBalanceBags,
      status,
      summaryText,
    });
  }

  return result.sort((a, b) => a.partyName.localeCompare(b.partyName));
}
