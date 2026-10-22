import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ReportService } from "../services/reportService";

export class ReportController {
  static async getBatchReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await ReportService.getBatchReport(req.params.id);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getBatchCSV(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await ReportService.getBatchReport(req.params.id);
      const rows = data.dailyRecords.map((r) => ({
        Date: r.date,
        AgeInDays: r.ageInDays,
        Mortality: r.mortalityCount,
        Cause: r.mortalityCause || "",
        Culls: r.culls,
        FeedBags: r.feedUsedBags,
        FeedKg: r.feedUsedKg,
        FeedType: r.feedType,
        WaterLiters: r.waterLiters,
        MinTemp: r.minTemp,
        MaxTemp: r.maxTemp,
        Litter: r.litterCondition,
      }));

      const csv = ReportService.convertToCSV(rows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="batch-${data.batch.batchNumber}-log.csv"`,
      );
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getShedComparison(
    _req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const data = await ReportService.getShedComparisonReport();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getFeedReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query as {
        startDate?: string;
        endDate?: string;
      };
      const data = await ReportService.getFeedReport(startDate, endDate);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getExpenseReport(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { batchId, startDate, endDate } = req.query as any;
      const data = await ReportService.getExpenseReport(
        batchId,
        startDate,
        endDate,
      );
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getSalesLedgerReport(
    _req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const data = await ReportService.getSalesLedgerReport();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getWagesReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const monthStr =
        (req.query.month as string) || new Date().toISOString().substring(0, 7);
      const data = await ReportService.getStaffWagesReport(monthStr);
      res.json({ success: true, month: monthStr, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
