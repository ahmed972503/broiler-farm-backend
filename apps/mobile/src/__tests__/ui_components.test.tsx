import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { EmptyState } from "../components/ui/EmptyState";
import { SyncStatusBanner } from "../components/ui/SyncStatusBanner";
import { useSyncStore } from "../store/useSyncStore";

describe("Design System UI Components", () => {
  describe("Button Component", () => {
    it("renders label and handles onPress callback", () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button title="Save Record" onPress={onPressMock} />,
      );

      const button = getByText("Save Record");
      expect(button).toBeTruthy();
      fireEvent.press(button);
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it("does not trigger onPress when disabled or loading", () => {
      const onPressMock = jest.fn();
      const { getByText, rerender } = render(
        <Button title="Submit" onPress={onPressMock} disabled />,
      );

      fireEvent.press(getByText("Submit"));
      expect(onPressMock).not.toHaveBeenCalled();

      rerender(<Button title="Submit" onPress={onPressMock} loading />);
    });
  });

  describe("Badge Component", () => {
    it("renders with correct status label and variant styling", () => {
      const { getByText } = render(
        <Badge label="Active Batch" variant="success" />,
      );
      expect(getByText("Active Batch")).toBeTruthy();
    });

    it("renders danger and warning badges", () => {
      const { getByText: getDanger } = render(
        <Badge label="High Mortality" variant="danger" />,
      );
      expect(getDanger("High Mortality")).toBeTruthy();

      const { getByText: getWarning } = render(
        <Badge label="Vaccine Due" variant="warning" />,
      );
      expect(getWarning("Vaccine Due")).toBeTruthy();
    });
  });

  describe("Card Component", () => {
    it("renders card children and responds to press when onPress is passed", () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Card onPress={onPressMock}>
          <Text>Shed 1 Live Status</Text>
        </Card>,
      );

      const content = getByText("Shed 1 Live Status");
      expect(content).toBeTruthy();
      fireEvent.press(content);
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("StatCard Component", () => {
    it("renders title, value, and subtitle properly", () => {
      const { getByText } = render(
        <StatCard
          title="FCR (Feed Conversion Ratio)"
          value="1.54"
          subtitle="Target: 1.58"
          trend="down"
        />,
      );

      expect(getByText("FCR (Feed Conversion Ratio)")).toBeTruthy();
      expect(getByText("1.54")).toBeTruthy();
      expect(getByText("Target: 1.58")).toBeTruthy();
    });
  });

  describe("EmptyState Component", () => {
    it("renders empty message and action button", () => {
      const onAction = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="No daily entries yet"
          description="Worker has not submitted an entry today."
          actionTitle="Add Entry Now"
          onAction={onAction}
        />,
      );

      expect(getByText("No daily entries yet")).toBeTruthy();
      expect(
        getByText("Worker has not submitted an entry today."),
      ).toBeTruthy();
      const actionBtn = getByText("Add Entry Now");
      fireEvent.press(actionBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("SyncStatusBanner Component", () => {
    it("renders synced notice when online and queue is 0", () => {
      useSyncStore.setState({
        pendingCount: 0,
        isSyncing: false,
        syncError: null,
      });
      const { getByText } = render(<SyncStatusBanner />);
      expect(
        getByText(/Tamam record server par sync|worker\.syncedNotice/i),
      ).toBeTruthy();
    });

    it("renders pending changes banner when items are queued", () => {
      useSyncStore.setState({
        pendingCount: 3,
        isSyncing: false,
        syncError: null,
      });
      const { getByText } = render(<SyncStatusBanner />);
      expect(getByText(/3/)).toBeTruthy();
      expect(getByText(/Baqi Records|sync\.pendingChanges/i)).toBeTruthy();
    });
  });
});
