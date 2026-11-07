import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import DailyEntryScreen from "../../app/(worker)/daily-entry";
import { OfflineStore } from "../db/offlineStore";
import { useAuthStore } from "../store/useAuthStore";

// Mock apiFetch
jest.mock("../api/client", () => ({
  apiFetch: jest.fn(async (url: string) => {
    if (url.includes("/api/batches")) {
      return {
        success: true,
        data: [
          {
            _id: "batch-mock-1",
            batchNumber: "B2026-01",
            chicksPlaced: 19888,
            status: "active",
            shedId: "shed-1",
          },
        ],
      };
    }
    if (url.includes("/api/settings")) {
      return {
        success: true,
        data: {
          customDailyColumnLabel: "E.S",
          customDailyColumnEnabled: true,
          defaultFeedBagWeightKg: 50,
        },
      };
    }
    return { success: true, data: [] };
  }),
  API_BASE_URL: "http://localhost:5000",
}));

describe("Worker Daily Entry Screen Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: "worker-1",
        username: "worker_ali",
        name: "Ali Ahmed",
        phone: "0301-1111111",
        role: "worker",
        assignedShedId: "shed-1",
      },
      token: "mock-worker-jwt",
      isAuthenticated: true,
    });
  });

  it("renders in Roman Urdu by default and displays day/night shift options", async () => {
    const { getByText, getByTestId } = render(<DailyEntryScreen />);

    // Header title translated to Roman Urdu
    expect(getByText(/Rozana Choozon Ka Khata/i)).toBeTruthy();
    expect(getByText("Din Ka Shift (DAY)")).toBeTruthy();
    expect(getByText("Raat Ka Shift (NIGHT)")).toBeTruthy();
    expect(getByText("Poora Din (24h FULL)")).toBeTruthy();
  });

  it("switches language between Roman Urdu and English", async () => {
    const { getByTestId, getByText } = render(<DailyEntryScreen />);

    // Initial language pill offers toggle to English
    const langBtn = getByTestId("language-toggle-btn");
    expect(getByText(/English/i)).toBeTruthy();

    // Toggle language
    fireEvent.press(langBtn);

    // Header now reflects English translation
    expect(getByText(/Daily Flock Record/i)).toBeTruthy();

    // Toggle back
    fireEvent.press(langBtn);
    expect(getByText(/Rozana Choozon Ka Khata/i)).toBeTruthy();
  });

  it("switches between Day and Night shift tabs", async () => {
    const { getByText, getByTestId } = render(<DailyEntryScreen />);

    const nightTab = getByTestId("shift-tab-night");
    fireEvent.press(nightTab);

    // After switching to night shift, Night Feed & Night Mortality inputs are visible
    expect(getByText(/Raat Ki Mout/i)).toBeTruthy();
    expect(getByText(/Raat Ki Khorak/i)).toBeTruthy();
  });

  it("increments and decrements feed bags using fast steppers", async () => {
    const { getByTestId, getByDisplayValue } = render(<DailyEntryScreen />);

    // Default Day Feed is 4
    expect(getByDisplayValue("4")).toBeTruthy();

    // Click +1 stepper for day feed
    const stepperPlus1 = getByTestId("feed-day-plus-1");
    fireEvent.press(stepperPlus1);
    expect(getByDisplayValue("5")).toBeTruthy();

    // Click +5 stepper
    const stepperPlus5 = getByTestId("feed-day-plus-5");
    fireEvent.press(stepperPlus5);
    expect(getByDisplayValue("10")).toBeTruthy();

    // Click -1 stepper
    const stepperMinus1 = getByTestId("feed-day-minus-1");
    fireEvent.press(stepperMinus1);
    expect(getByDisplayValue("9")).toBeTruthy();
  });

  it("detects and flags feed stock shortage during reconciliation", async () => {
    const { getByTestId, getByText } = render(<DailyEntryScreen />);

    // Initial state: opening 50, Day 4, Night 4 (total 8). Expected closing = 50 - 8 = 42
    // If user enters reported closing = 35 bags (7 bags missing)
    const closingInput = getByTestId("feed-closing-input");
    fireEvent.changeText(closingInput, "35");

    // Stock shortage warning badge should appear
    await waitFor(() => {
      expect(getByTestId("feed-shortage-badge")).toBeTruthy();
      expect(getByText(/STOCK SHORTAGE DETECTED/i)).toBeTruthy();
    });
  });

  it("submits the entry, stores mutation in offline store, and displays offline confirmation", async () => {
    const enqueueSpy = jest.spyOn(OfflineStore, "enqueueMutation");

    const { getByTestId, getByText } = render(<DailyEntryScreen />);

    // Set custom E.S column
    const esInput = getByTestId("custom-column-es-input");
    fireEvent.changeText(esInput, "12");

    const submitBtn = getByTestId("submit-daily-entry-btn");
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(enqueueSpy).toHaveBeenCalledWith(
        "DAILY_RECORD",
        "CREATE",
        expect.objectContaining({
          shift: "day",
          feedUsedDayShiftBags: 4,
          customColumnES: 12,
        }),
      );
      // Offline confirmation card displayed
      expect(getByTestId("saved-offline-banner")).toBeTruthy();
      expect(getByText(/Mehfooz Ho Gaya!/i)).toBeTruthy();
    });
  });
});
