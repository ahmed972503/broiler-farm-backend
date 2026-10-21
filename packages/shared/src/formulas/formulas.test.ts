import {
  calculateBirdsRemaining,
  calculateMortalityPercent,
  calculateDailyMortalityPercent,
  calculateFCR,
  calculateCostPerKg,
  calculateBatchProfit,
  calculateAverageDailyGain,
  calculateLivabilityPercent,
  calculateEPEF,
  bagsToKg,
  kgToBags,
  calculateEstimatedLiveWeightKg,
  compareWithTargetWeight,
  calculateBuyerBalance,
  calculateStaffWage,
  roundTo
} from './index';

describe('Broiler Business Formulas Unit Tests', () => {
  describe('roundTo', () => {
    it('rounds to specified decimals', () => {
      expect(roundTo(1.2345, 2)).toBe(1.23);
      expect(roundTo(1.2355, 2)).toBe(1.24);
      expect(roundTo(NaN)).toBe(0);
      expect(roundTo(Infinity)).toBe(0);
      expect(roundTo(-Infinity)).toBe(0);
    });
  });

  describe('calculateBirdsRemaining', () => {
    it('calculates remaining birds correctly', () => {
      const placed = 5000;
      const mortality = 120;
      const culls = 30;
      const sold = 1000;
      expect(calculateBirdsRemaining(placed, mortality, culls, sold)).toBe(3850);
    });

    it('handles zero parameters gracefully', () => {
      expect(calculateBirdsRemaining(5000)).toBe(5000);
      expect(calculateBirdsRemaining(0)).toBe(0);
      expect(calculateBirdsRemaining(-500)).toBe(0);
    });

    it('never returns negative numbers if mortality exceeds placed', () => {
      expect(calculateBirdsRemaining(100, 150, 10, 0)).toBe(0);
    });
  });

  describe('calculateMortalityPercent', () => {
    it('calculates mortality percentage using remaining birds', () => {
      // 5000 placed, 4850 remaining -> 150 dead -> 3.0%
      expect(calculateMortalityPercent(5000, 4850, true)).toBe(3.0);
    });

    it('calculates mortality percentage using cumulative dead count', () => {
      // 5000 placed, 175 dead -> 3.5%
      expect(calculateMortalityPercent(5000, 175, false)).toBe(3.5);
    });

    it('handles zero or negative placed count without error', () => {
      expect(calculateMortalityPercent(0, 10)).toBe(0);
      expect(calculateMortalityPercent(-100, 10)).toBe(0);
    });

    it('clamps to 100% maximum', () => {
      expect(calculateMortalityPercent(1000, 1500, false)).toBe(100);
      expect(calculateMortalityPercent(1000, -100, true)).toBe(100);
    });
  });

  describe('calculateDailyMortalityPercent', () => {
    it('calculates daily mortality rate', () => {
      // 25 dead on 5000 birds -> 0.5%
      expect(calculateDailyMortalityPercent(25, 5000)).toBe(0.5);
    });

    it('returns 0 when bird count is zero or dead count is zero', () => {
      expect(calculateDailyMortalityPercent(10, 0)).toBe(0);
      expect(calculateDailyMortalityPercent(0, 5000)).toBe(0);
      expect(calculateDailyMortalityPercent(-5, 5000)).toBe(0);
    });
  });

  describe('calculateFCR (Feed Conversion Ratio)', () => {
    it('computes FCR with 3 decimal precision', () => {
      // 15,500 kg feed consumed for 10,000 kg live weight -> 1.55 FCR
      expect(calculateFCR(15500, 10000)).toBe(1.55);
      // Realistic high-efficiency broiler: 8100 kg feed for 5300 kg live weight -> 1.528
      expect(calculateFCR(8100, 5300)).toBe(1.528);
    });

    it('handles zero live weight or zero feed safely', () => {
      expect(calculateFCR(0, 5000)).toBe(0);
      expect(calculateFCR(5000, 0)).toBe(0);
      expect(calculateFCR(-100, -200)).toBe(0);
    });
  });

  describe('calculateCostPerKg', () => {
    it('computes production cost per kg live weight', () => {
      // Total batch cost Rs. 2,500,000 for 10,000 kg sold -> Rs. 250/kg
      expect(calculateCostPerKg(2500000, 10000)).toBe(250);
    });

    it('returns 0 when live weight sold is 0 or negative', () => {
      expect(calculateCostPerKg(500000, 0)).toBe(0);
      expect(calculateCostPerKg(-500, 100)).toBe(0);
    });
  });

  describe('calculateBatchProfit', () => {
    it('computes net profit correctly', () => {
      // Revenue 3,200,000 - Cost 2,650,000 -> 550,000
      expect(calculateBatchProfit(3200000, 2650000)).toBe(550000);
      expect(calculateBatchProfit(0, 0)).toBe(0);
    });

    it('returns negative value if flock made a loss', () => {
      // Revenue 2,000,000 - Cost 2,300,000 -> -300,000
      expect(calculateBatchProfit(2000000, 2300000)).toBe(-300000);
    });
  });

  describe('calculateAverageDailyGain (ADG)', () => {
    it('computes daily weight gain in grams', () => {
      // 2100g at Day 35 (initial 42g): (2100 - 42) / 35 = 58.8g/day
      expect(calculateAverageDailyGain(2100, 42, 35)).toBe(58.8);
      // Default initial weight test
      expect(calculateAverageDailyGain(2100, undefined, 35)).toBe(58.8);
    });

    it('handles day zero or negative days safely', () => {
      expect(calculateAverageDailyGain(500, 42, 0)).toBe(0);
      expect(calculateAverageDailyGain(0, 42, 10)).toBe(0);
      expect(calculateAverageDailyGain(30, 42, 10)).toBe(0);
    });
  });

  describe('calculateLivabilityPercent', () => {
    it('calculates flock livability accurately', () => {
      // 5000 placed, 4850 remaining + 0 sold -> 97%
      expect(calculateLivabilityPercent(5000, 4850, 0)).toBe(97);
      // 5000 placed, 2000 remaining + 2800 sold -> 96%
      expect(calculateLivabilityPercent(5000, 2000, 2800)).toBe(96);
    });

    it('returns 0 if placed is 0 or negative', () => {
      expect(calculateLivabilityPercent(0, 500)).toBe(0);
      expect(calculateLivabilityPercent(-10, 500)).toBe(0);
    });
  });

  describe('calculateEPEF (European Production Efficiency Factor)', () => {
    it('computes standard broiler EPEF correctly', () => {
      // Livability 96.5%, Avg Weight 2.1 kg, Age 35 days, FCR 1.55
      // (96.5 * 2.1) / (35 * 1.55) * 100 = 202.65 / 54.25 * 100 = 373.5
      expect(calculateEPEF(96.5, 2.1, 35, 1.55)).toBe(373.5);
    });

    it('returns 0 if age, fcr or weight are zero', () => {
      expect(calculateEPEF(95, 2.0, 0, 1.5)).toBe(0);
      expect(calculateEPEF(95, 2.0, 35, 0)).toBe(0);
      expect(calculateEPEF(95, 0, 35, 1.5)).toBe(0);
      expect(calculateEPEF(0, 2.0, 35, 1.5)).toBe(0);
    });
  });

  describe('bagsToKg and kgToBags', () => {
    it('converts bags to kg using default 50kg bag weight', () => {
      expect(bagsToKg(10)).toBe(500);
      expect(bagsToKg(2.5)).toBe(125);
      expect(bagsToKg(-5)).toBe(0);
    });

    it('converts bags to kg using custom bag weight', () => {
      expect(bagsToKg(10, 25)).toBe(250);
      expect(bagsToKg(10, 0)).toBe(500); // defaults back to 50
    });

    it('converts kg to bags', () => {
      expect(kgToBags(500)).toBe(10);
      expect(kgToBags(125, 50)).toBe(2.5);
      expect(kgToBags(-50)).toBe(0);
      expect(kgToBags(100, 0)).toBe(2); // defaults back to 50
    });
  });

  describe('calculateEstimatedLiveWeightKg', () => {
    it('calculates total flock biomass from sample weight', () => {
      // 4500 birds * 1850 grams = 8325 kg
      expect(calculateEstimatedLiveWeightKg(4500, 1850)).toBe(8325);
    });

    it('returns 0 for zero birds or weight', () => {
      expect(calculateEstimatedLiveWeightKg(0, 1850)).toBe(0);
      expect(calculateEstimatedLiveWeightKg(4500, 0)).toBe(0);
      expect(calculateEstimatedLiveWeightKg(-10, 1850)).toBe(0);
    });
  });

  describe('compareWithTargetWeight', () => {
    it('identifies on-target performance', () => {
      // Day 21 target is 1060g
      const result = compareWithTargetWeight(21, 1070);
      expect(result.targetGrams).toBe(1060);
      expect(result.performanceStatus).toBe('on_target');
    });

    it('identifies above-target performance (>5% ahead)', () => {
      const result = compareWithTargetWeight(21, 1150);
      expect(result.performanceStatus).toBe('above_target');
    });

    it('identifies below-target performance (>5% behind)', () => {
      const result = compareWithTargetWeight(21, 950);
      expect(result.performanceStatus).toBe('below_target');
    });

    it('clamps age to 0-42 range', () => {
      const resOld = compareWithTargetWeight(50, 3900);
      expect(resOld.targetGrams).toBe(3820); // day 42
      const resYoung = compareWithTargetWeight(-5, 42);
      expect(resYoung.targetGrams).toBe(42); // day 0
    });
  });

  describe('calculateBuyerBalance', () => {
    it('calculates ledger balance accurately', () => {
      const result = calculateBuyerBalance(1500000, 1000000);
      expect(result.totalSaleAmount).toBe(1500000);
      expect(result.totalPaymentsReceived).toBe(1000000);
      expect(result.balanceAmount).toBe(500000);
    });

    it('handles negative or zero parameters', () => {
      const result = calculateBuyerBalance(0, 0);
      expect(result.balanceAmount).toBe(0);
    });
  });

  describe('calculateStaffWage', () => {
    it('computes wage with present days and advance deduction', () => {
      // 26 days at Rs. 1500/day = 39,000. Advance 5,000. Net = 34,000
      const wage = calculateStaffWage(1500, 26, 0, 5000);
      expect(wage.grossWage).toBe(39000);
      expect(wage.advanceDeductions).toBe(5000);
      expect(wage.netPayable).toBe(34000);
    });

    it('accounts for half days at 0.5 rate', () => {
      // 20 present + 2 half days = 21 effective days * 1000 = 21,000
      const wage = calculateStaffWage(1000, 20, 2, 0);
      expect(wage.grossWage).toBe(21000);
      expect(wage.netPayable).toBe(21000);
    });

    it('clamps net payable to 0 if advance exceeds earnings', () => {
      const wage = calculateStaffWage(1000, 5, 0, 10000);
      expect(wage.grossWage).toBe(5000);
      expect(wage.netPayable).toBe(0);
    });
  });
});
