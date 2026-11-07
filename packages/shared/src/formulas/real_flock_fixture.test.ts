import {
  calculateBirdsRemaining,
  calculateMortalityPercent,
  calculateDailyMortalityPercent,
  calculateFCR,
  calculateTrueFCR,
  calculateFarmMethodMetric,
  calculateWeeklyFlockSummaryRow,
  calculateDailyRecordSummary,
  calculateLiftingBirds,
  reconcileLiftingConsistency,
  calculateFeedPartyLedger,
  bagsToKg,
  kgToBags,
  roundTo,
} from "./index";

describe("Real Flock Test Fixture & Pakistan Paper Register Formula Verification", () => {
  // Real flock baseline specs from Pakistan 5-Shed Broiler Operation
  const FLOCK_INITIAL_PLACED = 19888;
  const BAG_WEIGHT_KG = 50.0;

  // Real paper register weekly snapshot figures
  const WEEKLY_DATA = [
    {
      week: 1,
      ageDays: 7,
      cumulativeFeedBags: 63,
      weeklyMortality: 144,
      cumulativeMortality: 144,
      avgWeightGrams: 200,
    },
    {
      week: 2,
      ageDays: 14,
      cumulativeFeedBags: 210,
      weeklyMortality: 79,
      cumulativeMortality: 223,
      avgWeightGrams: 493,
    },
    {
      week: 3,
      ageDays: 21,
      cumulativeFeedBags: 436,
      weeklyMortality: 84,
      cumulativeMortality: 307,
      avgWeightGrams: 883,
    },
    {
      week: 4,
      ageDays: 28,
      cumulativeFeedBags: 729,
      weeklyMortality: 447,
      cumulativeMortality: 754,
      avgWeightGrams: 1404,
    },
    {
      week: 5,
      ageDays: 35,
      cumulativeFeedBags: 1057,
      weeklyMortality: 1140,
      cumulativeMortality: 1894,
      avgWeightGrams: 2025,
    },
  ];

  describe("Week 1 Calculations & Farm Legacy Metric", () => {
    it("verifies Week 1 remaining chicks, total live weight, TRUE FCR, and Farm Method metric", () => {
      const w1 = calculateWeeklyFlockSummaryRow({
        weekNumber: 1,
        ageDays: 7,
        totalChicksPlaced: FLOCK_INITIAL_PLACED,
        currentCumulativeFeedBags: 63,
        previousCumulativeFeedBags: 0,
        currentCumulativeMortality: 144,
        previousCumulativeMortality: 0,
        averageWeightGrams: 200,
        bagWeightKg: BAG_WEIGHT_KG,
      });

      expect(w1.totalChicks).toBe(19888);
      expect(w1.weeklyMortality).toBe(144);
      expect(w1.totalMortality).toBe(144);
      expect(w1.remainingChicks).toBe(19744); // 19,888 - 144
      expect(w1.weeklyFeedBags).toBe(63);
      expect(w1.totalFeedBags).toBe(63);
      expect(w1.totalWeightKg).toBe(3948.8); // 19,744 * 0.200 kg

      // Farm method: total live weight (kg) / total feed (bags)
      // 3,948.8 kg / 63 bags = 62.6793... ≈ 62.68 (or 62.7)
      expect(w1.farmMethodFcr).toBeCloseTo(62.68, 1);
      expect(calculateFarmMethodMetric(3948.8, 63)).toBe(62.68);

      // TRUE FCR: total feed (kg) / total live weight (kg)
      // 63 bags * 50 kg = 3,150 kg feed / 3,948.8 kg live weight = 0.7977... ≈ 0.80
      expect(w1.trueFcr).toBeCloseTo(0.8, 2);
    });
  });

  describe("Week 5 Calculations, Arithmetic Correction, and TRUE FCR", () => {
    it("computes weekly feed from daily records (verifies 1057 - 729 = 328, correcting paper register 428)", () => {
      const prevCumFeed = 729;
      const currentCumFeed = 1057;

      const w5 = calculateWeeklyFlockSummaryRow({
        weekNumber: 5,
        ageDays: 35,
        totalChicksPlaced: FLOCK_INITIAL_PLACED,
        currentCumulativeFeedBags: currentCumFeed,
        previousCumulativeFeedBags: prevCumFeed,
        currentCumulativeMortality: 1894,
        previousCumulativeMortality: 754,
        averageWeightGrams: 2025,
        bagWeightKg: BAG_WEIGHT_KG,
      });

      // Crucial test requested in prompt:
      // Paper register recorded 428 by human arithmetic error.
      // App must compute 1057 - 729 = 328 bags!
      expect(w5.weeklyFeedBags).toBe(328);
      expect(w5.weeklyFeedBags).not.toBe(428);
      expect(w5.weeklyMortality).toBe(1140); // 1894 - 754
      expect(w5.remainingChicks).toBe(17994); // 19888 - 1894
      expect(w5.totalWeightKg).toBe(36437.85); // 17,994 * 2.025 kg

      // TRUE FCR for week 5 is about 1.45 when bag weight is 50 kg
      // 1057 bags * 50 kg = 52,850 kg feed
      // 52,850 / 36,437.85 = 1.4504... ≈ 1.45
      expect(w5.trueFcr).toBe(1.45);
    });
  });

  describe("Mortality-Spike Alert on High-Mortality Days", () => {
    it("detects when daily mortality reaches or exceeds 1.0% of live birds start of day", () => {
      // In week 5, weekly mortality was 1,140 birds out of ~18,000 birds
      const liveBirdsStart = 18500;

      // Safe day: 45 deaths -> 45 / 18,500 = 0.24%
      const safeDayMortalityPercent = calculateDailyMortalityPercent(
        45,
        liveBirdsStart,
      );
      expect(safeDayMortalityPercent).toBe(0.24);
      expect(safeDayMortalityPercent < 1.0).toBe(true);

      // Severe disease outbreak day: 220 deaths in 24h
      // 220 / 18,500 = 1.189% >= 1.0% threshold
      const spikeDayMortalityPercent = calculateDailyMortalityPercent(
        220,
        liveBirdsStart,
      );
      expect(spikeDayMortalityPercent).toBe(1.19);
      expect(spikeDayMortalityPercent >= 1.0).toBe(true);
    });
  });

  describe("Catching / Lifting Lots and Reconciliation", () => {
    it("calculates bird counts from total weight (kg) and average weight (kg)", () => {
      // Lot 1: 3475 kg @ 2.25 kg avg -> 3475 / 2.25 = 1544.44 -> 1544 birds
      const lot1 = calculateLiftingBirds(3475, 2.25);
      expect(lot1.calculatedBirds).toBe(1544);
      expect(lot1.birds).toBe(1544);
      expect(lot1.isOverridden).toBe(false);

      // Lot 2: 3111 kg @ 2.56 kg avg -> 3111 / 2.56 = 1215.23 -> 1215 birds
      const lot2 = calculateLiftingBirds(3111, 2.56);
      expect(lot2.calculatedBirds).toBe(1215);
      expect(lot2.birds).toBe(1215);

      // Lot 3: roughly 1500 birds (e.g. 3600 kg @ 2.40 kg avg)
      const lot3 = calculateLiftingBirds(3600, 2.4);
      expect(lot3.calculatedBirds).toBe(1500);
      expect(lot3.birds).toBe(1500);

      // Manual override test: scale count manual override with a reason
      const overriddenLot = calculateLiftingBirds(
        3475,
        2.25,
        1540,
        "Scale tare discount: 4 dead on arrival deducted by buyer",
      );
      expect(overriddenLot.calculatedBirds).toBe(1544);
      expect(overriddenLot.birds).toBe(1540);
      expect(overriddenLot.isOverridden).toBe(true);
      expect(overriddenLot.overrideReason).toBe(
        "Scale tare discount: 4 dead on arrival deducted by buyer",
      );
    });

    it("reconciles flock consistency: placed - cumulative mortality - lifted = remaining birds", () => {
      const finalMortality = 2555; // Cumulative mortality at end of 45 days
      const totalLifted = 1544 + 1215 + 1500; // 4259 birds lifted in partial lots
      const expectedRemaining =
        FLOCK_INITIAL_PLACED - finalMortality - totalLifted;
      // 19888 - 2555 - 4259 = 13074 birds

      const reconciliation = reconcileLiftingConsistency(
        FLOCK_INITIAL_PLACED,
        finalMortality,
        totalLifted,
        expectedRemaining,
        10,
      );

      expect(reconciliation.isConsistent).toBe(true);
      expect(reconciliation.discrepancy).toBe(0);
      expect(reconciliation.expectedRemaining).toBe(13074);
      expect(reconciliation.warning).toBeUndefined();

      // Discrepancy beyond tolerance generates warning
      const badReport = reconcileLiftingConsistency(
        FLOCK_INITIAL_PLACED,
        finalMortality,
        totalLifted,
        13050, // 24 birds missing unaccounted for
        10,
      );
      expect(badReport.isConsistent).toBe(false);
      expect(badReport.discrepancy).toBe(-24);
      expect(badReport.warning).toBeDefined();
    });
  });

  describe("Daily Record Summary & Stock Reconciliation", () => {
    it("accurately computes 24h totals and detects stock shortage when closing stock != expected", () => {
      const daySummary = calculateDailyRecordSummary({
        openingFeedStockBags: 120,
        feedUsedDayShiftBags: 12,
        feedUsedNightShiftBags: 14,
        feedReceivedBags: 50,
        feedTransferredOutBags: 10,
        previousCumulativeFeedBags: 200,
        reportedClosingFeedStockBags: 144, // Expected: 120 - 26 + 50 - 10 = 134. If reported is 144 or 130, check discrepancy.
        bagWeightKg: 50,
        openingBirds: 19500,
        mortalityDayShift: 8,
        mortalityNightShift: 12,
        previousCumulativeMortality: 300,
        culls: 2,
        liftedBirds: 0,
      });

      expect(daySummary.feedUsed24hBags).toBe(26);
      expect(daySummary.feedUsedKg).toBe(1300);
      expect(daySummary.cumulativeFeedBags).toBe(226);
      expect(daySummary.expectedClosingFeedStockBags).toBe(134);
      expect(daySummary.mortality24h).toBe(20);
      expect(daySummary.cumulativeMortality).toBe(320);
      expect(daySummary.closingBirds).toBe(19478); // 19500 - 20 - 2

      // Shortage detection test:
      const shortageSummary = calculateDailyRecordSummary({
        openingFeedStockBags: 100,
        feedUsedDayShiftBags: 10,
        feedUsedNightShiftBags: 10,
        previousCumulativeFeedBags: 50,
        reportedClosingFeedStockBags: 75, // Expected is 80 (shortage of 5 bags missing!)
        openingBirds: 19000,
        mortalityDayShift: 5,
        mortalityNightShift: 5,
      });

      expect(shortageSummary.expectedClosingFeedStockBags).toBe(80);
      expect(shortageSummary.closingFeedStockBags).toBe(75);
      expect(shortageSummary.feedStockDiscrepancyBags).toBe(-5);
      expect(shortageSummary.hasFeedStockShortage).toBe(true);
    });
  });

  describe("Feed Transfers & Running Party Ledger in Bags", () => {
    it("computes running party ledger in bags to show who owes whom", () => {
      const transfers = [
        {
          partyName: "Chenab Poultry Farm",
          type: "transfer_in" as const,
          bags: 30, // We borrowed 30 bags from Chenab
        },
        {
          partyName: "Chenab Poultry Farm",
          type: "transfer_out" as const,
          bags: 10, // We returned 10 bags to Chenab
        },
        {
          partyName: "Haji Aslam Farm",
          type: "transfer_out" as const,
          bags: 25, // We lent 25 bags to Haji Aslam
        },
      ];

      const ledger = calculateFeedPartyLedger(transfers);
      expect(ledger.length).toBe(2);

      const chenab = ledger.find((p) => p.partyName === "Chenab Poultry Farm")!;
      expect(chenab.totalBagsIn).toBe(30);
      expect(chenab.totalBagsOut).toBe(10);
      expect(chenab.netBalanceBags).toBe(-20);
      expect(chenab.status).toBe("we_owe_them");
      expect(chenab.summaryText).toContain(
        "We owe Chenab Poultry Farm 20 bags",
      );

      const haji = ledger.find((p) => p.partyName === "Haji Aslam Farm")!;
      expect(haji.totalBagsIn).toBe(0);
      expect(haji.totalBagsOut).toBe(25);
      expect(haji.netBalanceBags).toBe(25);
      expect(haji.status).toBe("they_owe_us");
      expect(haji.summaryText).toContain("Haji Aslam Farm owes us 25 bags");

      // Test settled balance & default party name
      const settledLedger = calculateFeedPartyLedger([
        { partyName: "", type: "transfer_in", bags: 10 },
        { partyName: "   ", type: "transfer_out", bags: 10 },
      ]);
      expect(settledLedger[0].partyName).toBe("Unknown Party");
      expect(settledLedger[0].status).toBe("settled");
      expect(settledLedger[0].summaryText).toContain(
        "All feed accounts settled",
      );
    });
  });

  describe("Formulas Edge Cases & Branch Coverage", () => {
    it("handles zero and negative cases in True FCR and Farm Method metric", () => {
      expect(calculateTrueFCR(0, 1000)).toBe(0);
      expect(calculateTrueFCR(100, 0)).toBe(0);
      expect(calculateTrueFCR(1000, 500, false)).toBe(2); // isBags = false
      expect(calculateTrueFCR(0, 0, false)).toBe(0);

      expect(calculateFarmMethodMetric(0, 100)).toBe(0);
      expect(calculateFarmMethodMetric(1000, 0)).toBe(0);
      expect(calculateFarmMethodMetric(-500, 10)).toBe(0);
    });

    it("handles lifting calculation edge cases (0 avg weight, positive discrepancy)", () => {
      const zeroAvg = calculateLiftingBirds(1000, 0);
      expect(zeroAvg.calculatedBirds).toBe(0);
      expect(zeroAvg.birds).toBe(0);

      const positiveDiscrepancy = reconcileLiftingConsistency(
        1000,
        50,
        100,
        900, // expected 850, reported 900 -> +50
        10,
      );
      expect(positiveDiscrepancy.isConsistent).toBe(false);
      expect(positiveDiscrepancy.discrepancy).toBe(50);
      expect(positiveDiscrepancy.warning).toContain("+50");
    });

    it("handles default values in calculateDailyRecordSummary", () => {
      const minimalSummary = calculateDailyRecordSummary({
        openingFeedStockBags: 50,
        feedUsedDayShiftBags: 5,
        feedUsedNightShiftBags: 5,
        openingBirds: 1000,
        mortalityDayShift: 2,
        mortalityNightShift: 3,
      });

      expect(minimalSummary.feedUsed24hBags).toBe(10);
      expect(minimalSummary.closingFeedStockBags).toBe(40);
      expect(minimalSummary.feedStockDiscrepancyBags).toBe(0);
      expect(minimalSummary.hasFeedStockShortage).toBe(false);
      expect(minimalSummary.mortality24h).toBe(5);
      expect(minimalSummary.cumulativeMortality).toBe(5);
      expect(minimalSummary.closingBirds).toBe(995);
    });

    it("handles weekly flock summary with partial lifting lots", () => {
      const weekWithLifting = calculateWeeklyFlockSummaryRow({
        weekNumber: 6,
        ageDays: 42,
        totalChicksPlaced: 20000,
        currentCumulativeFeedBags: 1200,
        previousCumulativeFeedBags: 1000,
        currentCumulativeMortality: 1500,
        previousCumulativeMortality: 1200,
        averageWeightGrams: 2400,
        totalLiftedBirds: 5000,
        bagWeightKg: 50,
      });

      // Remaining = 20000 - 1500 - 5000 = 13500
      expect(weekWithLifting.remainingChicks).toBe(13500);
      expect(weekWithLifting.totalWeightKg).toBe(13500 * 2.4);
    });
  });
});
