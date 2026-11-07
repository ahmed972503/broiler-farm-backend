import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AdminSalesScreen from "../../app/(admin)/sales";
import { apiFetch } from "../api/client";
import { useAuthStore } from "../store/useAuthStore";

jest.mock("../api/client", () => ({
  apiFetch: jest.fn(async (url: string, opts?: any) => {
    if (url.includes("/api/sheds")) {
      return {
        success: true,
        data: [
          {
            _id: "shed-1",
            name: "Shed 1",
            currentBatchId: "batch-1",
            currentBatch: { _id: "batch-1", batchNumber: "B2026-01" },
          },
        ],
      };
    }
    if (url.includes("/api/sales/consistency")) {
      return {
        success: true,
        data: {
          chicksPlaced: 19888,
          totalMortality: 1894,
          totalLifted: 2759,
          expectedRemaining: 15235,
          reportedRemaining: 15235,
          difference: 0,
          isConsistent: true,
        },
      };
    }
    if (url.includes("/api/sales") && (!opts || opts.method !== "POST")) {
      return {
        success: true,
        data: [
          {
            _id: "sale-1",
            lotNumber: 1,
            buyerName: "Haji Aslam Chicken Merchant",
            totalLiveWeightKg: 3475,
            averageWeightKg: 2.25,
            birdsSold: 1544,
            ratePerKg: 420,
            totalAmount: 1459500,
            amountPaid: 1000000,
            balanceDue: 459500,
            paymentStatus: "partial",
          },
        ],
      };
    }
    if (url.includes("/api/sales") && opts?.method === "POST") {
      return {
        success: true,
        data: {
          _id: "sale-2",
          ...JSON.parse(opts.body),
        },
      };
    }
    return { success: true, data: [] };
  }),
  API_BASE_URL: "http://localhost:5000",
}));

describe("Catching (Lifting) & Sales Screen Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: "admin-1",
        username: "admin_haji",
        name: "Haji Ahmed",
        phone: "0300-1234567",
        role: "admin",
      },
      token: "mock-admin-token",
      isAuthenticated: true,
    });
  });

  it("renders catching screen and displays flock consistency reconciliation status", async () => {
    const { getByText, getByTestId } = render(<AdminSalesScreen />);

    expect(getByText(/Bird Catching & Lifting Notes/i)).toBeTruthy();

    await waitFor(() => {
      expect(getByTestId("lifting-consistency-card")).toBeTruthy();
      expect(getByText("19,888")).toBeTruthy(); // Chicks placed
      expect(getByText("-1894")).toBeTruthy(); // Mortality
      expect(getByText("-2759")).toBeTruthy(); // Total lifted
      expect(getByText("=15235")).toBeTruthy(); // Remaining
    });
  });

  it("opens new catching lot form and auto-computes birds from total weight and average weight", async () => {
    const { getByTestId, getByText } = render(<AdminSalesScreen />);

    // Toggle form open
    const newLotBtn = getByTestId("new-sale-toggle-btn");
    fireEvent.press(newLotBtn);

    expect(getByTestId("lifting-sale-form")).toBeTruthy();

    // Fill Total Live Weight = 3475 kg and Avg Weight = 2.25 kg
    const totalWeightInput = getByTestId("total-weight-input");
    const avgWeightInput = getByTestId("avg-weight-input");
    const rateInput = getByTestId("rate-per-kg-input");

    fireEvent.changeText(totalWeightInput, "3475");
    fireEvent.changeText(avgWeightInput, "2.25");
    fireEvent.changeText(rateInput, "420");

    // Check auto-computed birds: Math.round(3475 / 2.25) = 1544 birds
    const computedBirdsEl = getByTestId("computed-birds-text");
    expect(computedBirdsEl).toBeTruthy();
    expect(computedBirdsEl.props.children[0]).toBe(1544);

    // Check total invoice: 3475 * 420 = 1,459,500
    expect(getByText(/Rs\. 1,459,500/i)).toBeTruthy();
  });

  it("allows manual override of bird count with mandatory reason and submits sale", async () => {
    const { getByTestId, getByText, getAllByText } = render(
      <AdminSalesScreen />,
    );

    // Wait for initial data load so selectedShedId is populated
    await waitFor(() =>
      expect(getByTestId("lifting-consistency-card")).toBeTruthy(),
    );

    // Open form
    fireEvent.press(getByTestId("new-sale-toggle-btn"));

    // Enter buyer info
    fireEvent.changeText(
      getByTestId("buyer-name-input"),
      "Malik Poultry Traders",
    );
    fireEvent.changeText(getByTestId("total-weight-input"), "3111");
    fireEvent.changeText(getByTestId("avg-weight-input"), "2.56");
    fireEvent.changeText(getByTestId("rate-per-kg-input"), "400");

    // 3111 / 2.56 = 1215 birds
    const computedEl = getByTestId("computed-birds-text");
    expect(computedEl.props.children[0]).toBe(1215);

    // Toggle manual override switch
    const overrideSwitch = getByTestId("override-switch");
    fireEvent(overrideSwitch, "valueChange", true);

    // Enter manual override count and reason
    const overrideCountInput = getByTestId("override-count-input");
    const overrideReasonInput = getByTestId("override-reason-input");
    fireEvent.changeText(overrideCountInput, "1220");
    fireEvent.changeText(
      overrideReasonInput,
      "Physical cage count verified at weighbridge",
    );

    // Submit sale
    const submitBtn = getByTestId("submit-sale-btn");
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/sales",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"birdsSold":1220'),
        }),
      );
    });
  });
});
