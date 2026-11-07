import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AdminDashboardScreen from "../../app/(admin)/dashboard";
import ReportsScreen from "../../app/(admin)/reports";
import { apiFetch } from "../api/client";
import { useAuthStore } from "../store/useAuthStore";

jest.mock("../api/client", () => ({
  apiFetch: jest.fn(async (url: string, opts?: any) => {
    // 1. Dashboard
    if (url === "/api/dashboard") {
      return {
        success: true,
        data: {
          financials: {
            totalSalesRevenue: 4500000,
            totalExpenses: 3200000,
            netFarmProfit: 1300000,
            outstandingReceivables: 450000,
          },
          alerts: {
            list: [
              {
                _id: "alert-1",
                title: "Mortality Spike Alert",
                message: "Shed 1 daily mortality exceeded 1.0% threshold (215 birds)",
                severity: "critical",
              },
            ],
          },
          sheds: [
            {
              shedId: "shed-1",
              shedName: "Shed 1",
              workerName: "Ali Ahmed",
              status: "active",
              currentBatch: {
                batchNumber: "B2026-01",
                ageInDays: 35,
                birdsRemaining: 18000,
                fcrEstimate: 1.45,
                mortalityRate: 9.5,
              },
            },
            {
              shedId: "shed-2",
              shedName: "Shed 2",
              workerName: "Tariq Mahmood",
              status: "active",
              currentBatch: {
                batchNumber: "B2026-02",
                ageInDays: 28,
                birdsRemaining: 19500,
                fcrEstimate: 1.38,
                mortalityRate: 2.1,
              },
            },
          ],
        },
      };
    }

    // 2. Batches
    if (url === "/api/batches") {
      return {
        success: true,
        data: [
          {
            _id: "batch-1",
            batchNumber: "B2026-01",
            chicksPlaced: 19888,
            status: "active",
          },
        ],
      };
    }

    // 3. Weekly Summary (Paper Format)
    if (url.includes("/api/reports/weekly-summary/")) {
      return {
        success: true,
        data: {
          batchNumber: "B2026-01",
          chicksPlaced: 19888,
          weeks: [
            {
              weekNumber: 1,
              totalChicks: 19888,
              remainingChicks: 19744,
              weeklyFeedBags: 63,
              totalFeedBags: 63,
              weeklyMortality: 144,
              totalMortality: 144,
              averageWeightGrams: 200,
              totalWeightKg: 3949,
              trueFCR: 0.8,
              farmMethodWeightPerBag: 62.68,
            },
            {
              weekNumber: 5,
              totalChicks: 19888,
              remainingChicks: 17994,
              weeklyFeedBags: 328,
              totalFeedBags: 1057,
              weeklyMortality: 1140,
              totalMortality: 1894,
              averageWeightGrams: 2025,
              totalWeightKg: 36438,
              trueFCR: 1.45,
              farmMethodWeightPerBag: 34.47,
            },
          ],
        },
      };
    }

    // 4. Daily Register (Paper Layout)
    if (url.includes("/api/reports/daily-register/")) {
      return {
        success: true,
        data: {
          batchNumber: "B2026-01",
          chicksPlaced: 19888,
          customDailyColumnLabel: "E.S",
          rows: [
            {
              date: "2026-03-01",
              dayNumber: 1,
              openingFeedStockBags: 100,
              feedUsedDayBags: 4,
              feedUsedNightBags: 4,
              totalFeed24hBags: 8,
              cumulativeFeedBags: 8,
              closingFeedStockBags: 92,
              openingBirds: 19888,
              mortalityDay: 10,
              mortalityNight: 8,
              totalMortality24h: 18,
              cumulativeMortality: 18,
              closingBirds: 19870,
              esColumnValue: 5,
              feedRemarks: "Initial Star Feed delivered",
            },
          ],
        },
      };
    }

    // 5. Party Ledger
    if (url === "/api/party-ledger") {
      return {
        success: true,
        data: [
          {
            partyName: "Star Feed Dealers",
            bagsReceived: 200,
            bagsGiven: 50,
            netBalanceBags: 150,
          },
          {
            partyName: "Haji Aslam Farm",
            bagsReceived: 20,
            bagsGiven: 60,
            netBalanceBags: -40,
          },
        ],
      };
    }

    // 6. CSV History Import
    if (url === "/api/import-history" && opts?.method === "POST") {
      return {
        success: true,
        data: {
          totalRows: 2,
          importedRecords: 2,
          errors: [],
        },
      };
    }

    return { success: true, data: [] };
  }),
  API_BASE_URL: "http://localhost:5000",
}));

describe("Admin Dashboard & Paper Register Screens Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        _id: "admin-1",
        id: "admin-1",
        username: "admin_haji",
        fullName: "Haji Ahmed",
        role: "admin",
        mustChangePassword: false,
      },
      token: "mock-admin-token",
      isAuthenticated: true,
    });
  });

  describe("Admin Dashboard Screen", () => {
    it("renders financial cards, active alerts, and 5 sheds flock status", async () => {
      const { getByText } = render(<AdminDashboardScreen />);

      await waitFor(() => {
        // Financial cards
        expect(getByText("Rs. 4,500,000")).toBeTruthy();
        expect(getByText("Rs. 3,200,000")).toBeTruthy();
        expect(getByText("Rs. 1,300,000")).toBeTruthy();
        expect(getByText("Rs. 450,000")).toBeTruthy();

        // Critical alert banner
        expect(getByText(/Mortality Spike Alert/i)).toBeTruthy();
        expect(getByText(/215 birds/i)).toBeTruthy();

        // Sheds live status
        expect(getByText("Shed 1")).toBeTruthy();
        expect(getByText("Worker: Ali Ahmed")).toBeTruthy();
        expect(getByText("Shed 2")).toBeTruthy();
        expect(getByText("Worker: Tariq Mahmood")).toBeTruthy();
      });
    });
  });

  describe("Admin Paper Register & Reports Screen", () => {
    it("renders Weekly Flock Summary displaying TRUE FCR and Farm method separately", async () => {
      const { getByText, getByTestId } = render(<ReportsScreen />);

      await waitFor(() => {
        // Explanatory metric banner
        expect(getByText(/Metric Standard:/i)).toBeTruthy();
        expect(getByText(/TRUE FCR:/i)).toBeTruthy();
        expect(getByText(/Farm method:/i)).toBeTruthy();

        // Week 1 Metrics
        expect(getByText("W1")).toBeTruthy();
        expect(getByText("62.68")).toBeTruthy(); // Farm method (kg live weight per feed bag)

        // Week 5 Metrics
        expect(getByText("W5")).toBeTruthy();
        expect(getByText("1.45")).toBeTruthy(); // TRUE FCR
        expect(getByText("34.47")).toBeTruthy(); // Farm method
      });
    });

    it("renders Daily Register table matching the 16 paper notebook columns including custom E.S", async () => {
      const { getByTestId, getByText } = render(<ReportsScreen />);

      // Switch to Daily Register tab
      const dailyTab = getByTestId("report-tab-daily_paper");
      fireEvent.press(dailyTab);

      await waitFor(() => {
        expect(getByText(/DAILY REGISTER \(Rozana Register - 45 Days\)/i)).toBeTruthy();
        // Column headers
        expect(getByText("Op Feed")).toBeTruthy();
        expect(getByText("Feed Day")).toBeTruthy();
        expect(getByText("Feed Ngt")).toBeTruthy();
        expect(getByText("24h Feed")).toBeTruthy();
        expect(getByText("Cum Feed")).toBeTruthy();
        expect(getByText("Cls Feed")).toBeTruthy();
        expect(getByText("Op Birds")).toBeTruthy();
        expect(getByText("Mort Day")).toBeTruthy();
        expect(getByText("Mort Ngt")).toBeTruthy();
        expect(getByText("24h Mort")).toBeTruthy();
        expect(getByText("Cum Mort")).toBeTruthy();
        expect(getByText("Cls Birds")).toBeTruthy();
        expect(getByText("E.S")).toBeTruthy(); // Custom daily column
        expect(getByText("Feed Remarks")).toBeTruthy();

        // Row values
        expect(getByText("Initial Star Feed delivered")).toBeTruthy();
      });
    });

    it("renders Feed Party Ledger with running bag balances and debt status badges", async () => {
      const { getByTestId, getByText, getAllByText } = render(<ReportsScreen />);

      // Switch to Feed Party Ledger tab
      const partyTab = getByTestId("report-tab-party_ledger");
      fireEvent.press(partyTab);

      await waitFor(() => {
        expect(getAllByText(/FEED PARTY LEDGER/i).length).toBeGreaterThanOrEqual(1);
        expect(getByText("Star Feed Dealers")).toBeTruthy();
        expect(getByText("+150 Bags")).toBeTruthy();
        expect(getByText("Owes Us")).toBeTruthy();

        expect(getByText("Haji Aslam Farm")).toBeTruthy();
        expect(getByText("-40 Bags")).toBeTruthy();
        expect(getByText("We Owe")).toBeTruthy();
      });
    });

    it("imports historical CSV register rows with validation feedback", async () => {
      const { getByTestId, getByText } = render(<ReportsScreen />);

      // Switch to CSV Import tab
      const importTab = getByTestId("report-tab-csv_import");
      fireEvent.press(importTab);

      expect(getByText(/Historical Paper Register CSV Import/i)).toBeTruthy();

      const csvInput = getByTestId("csv-import-input");
      fireEvent.changeText(
        csvInput,
        "date,dayNumber,openingFeedStockBags,feedUsedDayBags,feedUsedNightBags,closingFeedStockBags,openingBirds,mortalityDay,mortalityNight,closingBirds\n2026-03-01,1,100,5,4,91,19888,10,12,19866"
      );

      const submitBtn = getByTestId("submit-csv-import-btn");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          "/api/import-history",
          expect.objectContaining({
            method: "POST",
          })
        );
        expect(getByTestId("import-result-card")).toBeTruthy();
        expect(getByText(/Successfully imported 2 of 2 rows/i)).toBeTruthy();
      });
    });
  });
});
