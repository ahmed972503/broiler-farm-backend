import cron, { ScheduledTask } from "node-cron";
import { AlertService } from "./alertService";

export class CronService {
  private static alertSweepTask: ScheduledTask | null = null;
  private static isRunning = false;

  /**
   * Initializes and starts background cron jobs
   * Default schedule: every hour at minute 0 ('0 * * * *')
   */
  static start(cronExpression = "0 * * * *"): ScheduledTask {
    if (this.alertSweepTask) {
      this.alertSweepTask.stop();
    }

    this.alertSweepTask = cron.schedule(cronExpression, async () => {
      await this.runSweep();
    });

    this.isRunning = true;
    return this.alertSweepTask;
  }

  /**
   * Stops the active cron schedule
   */
  static stop(): void {
    if (this.alertSweepTask) {
      this.alertSweepTask.stop();
      this.alertSweepTask = null;
    }
    this.isRunning = false;
  }

  /**
   * Directly triggers an alert sweep execution (useful for manual runs & tests)
   */
  static async triggerNow(): Promise<void> {
    await this.runSweep();
  }

  /**
   * Check if scheduler is active
   */
  static getStatus(): { isRunning: boolean; hasTask: boolean } {
    return {
      isRunning: this.isRunning,
      hasTask: this.alertSweepTask !== null,
    };
  }

  private static async runSweep(): Promise<void> {
    try {
      await AlertService.runAlertSweep();
    } catch (err: any) {
      if (process.env.NODE_ENV !== "test") {
        console.error("[CronService] Error during alert sweep execution:", err);
      }
    }
  }
}
