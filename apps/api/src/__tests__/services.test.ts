import { ReportService } from '../services/reportService';
import { calculateBirdsRemaining, calculateFCR, calculateEPEF, calculateStaffWage } from '@broiler/shared';

describe('Report and Service Logic Tests', () => {
  describe('ReportService.convertToCSV', () => {
    it('returns empty string for empty array', () => {
      expect(ReportService.convertToCSV([])).toBe('');
    });

    it('converts array of objects to valid CSV format', () => {
      const data = [
        { shed: 'Shed 1', birdsRemaining: 4950, mortality: 50 },
        { shed: 'Shed 2', birdsRemaining: 4890, mortality: 110 },
      ];

      const csv = ReportService.convertToCSV(data);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('shed,birdsRemaining,mortality');
      expect(lines[1]).toBe('"Shed 1","4950","50"');
      expect(lines[2]).toBe('"Shed 2","4890","110"');
    });

    it('escapes quotes and handles special characters in CSV', () => {
      const data = [{ notes: 'Chicks "healthy", good appetite' }];
      const csv = ReportService.convertToCSV(data);
      expect(csv).toContain('"Chicks ""healthy"", good appetite"');
    });
  });

  describe('Flock Harvest and Production Calculations', () => {
    it('accurately reconciles bird counts during flock life cycle', () => {
      const placed = 5000;
      const mortality = 120;
      const culls = 30;
      const birdsSold = 2000;

      const remaining = calculateBirdsRemaining(placed, mortality, culls, birdsSold);
      expect(remaining).toBe(2850);
    });

    it('calculates FCR correctly', () => {
      const totalFeedKg = 15000;
      const totalWeightKg = 9800;

      const fcr = calculateFCR(totalFeedKg, totalWeightKg);
      expect(fcr).toBe(1.531);
    });

    it('calculates EPEF (European Production Efficiency Factor)', () => {
      const livability = 97.5;
      const avgWeightKg = 2.15;
      const ageDays = 35;
      const fcr = 1.55;

      const epef = calculateEPEF(livability, avgWeightKg, ageDays, fcr);
      expect(epef).toBeGreaterThan(350);
      expect(epef).toBe(386.4);
    });

    it('calculates staff wages with attendance and advance deductions', () => {
      const dailyWage = 1200;
      const presentDays = 25;
      const halfDays = 2;
      const advanceDeductions = 5000;

      const wage = calculateStaffWage(dailyWage, presentDays, halfDays, advanceDeductions);
      // gross = (25 * 1200) + (2 * 600) = 30000 + 1200 = 31200
      // net = 31200 - 5000 = 26200
      expect(wage.grossWage).toBe(31200);
      expect(wage.advanceDeductions).toBe(5000);
      expect(wage.netPayable).toBe(26200);
    });
  });
});
