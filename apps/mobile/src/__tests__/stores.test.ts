import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore, AuthUser } from "../store/useAuthStore";
import { useSyncStore } from "../store/useSyncStore";
import { OfflineStore } from "../db/offlineStore";

// Mock fetch globally
const globalFetch = global.fetch;

describe("Mobile Zustand Stores (useAuthStore & useSyncStore)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await OfflineStore.getDb();
    await OfflineStore.clearAll();
  });

  afterAll(() => {
    global.fetch = globalFetch;
  });

  describe("useAuthStore", () => {
    const mockUser: AuthUser = {
      id: "u-123",
      username: "worker1",
      name: "Tariq Mahmood",
      phone: "+923001234567",
      role: "worker",
      assignedShedId: "s-1",
      shed: {
        id: "s-1",
        name: "Shed 1",
        shedNumber: 1,
        currentBatchId: "b-100",
      },
    };

    it("should set authentication session and persist to AsyncStorage", async () => {
      await useAuthStore
        .getState()
        .setAuth(mockUser, "token-abc", "refresh-xyz");

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe("token-abc");
      expect(state.refreshToken).toBe("refresh-xyz");
      expect(state.isLoading).toBe(false);

      const storedUser = await AsyncStorage.getItem("@broiler_farm_auth_user");
      expect(JSON.parse(storedUser!)).toEqual(mockUser);
    });

    it("should restore session from AsyncStorage", async () => {
      await AsyncStorage.setItem(
        "@broiler_farm_auth_user",
        JSON.stringify(mockUser),
      );
      await AsyncStorage.setItem("@broiler_farm_auth_token", "saved-token");
      await AsyncStorage.setItem("@broiler_farm_auth_refresh", "saved-refresh");

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe("saved-token");
      expect(state.user?.name).toBe("Tariq Mahmood");
    });

    it("should logout cleanly and clear AsyncStorage", async () => {
      await useAuthStore.getState().setAuth(mockUser, "tok", "ref");
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();

      const storedUser = await AsyncStorage.getItem("@broiler_farm_auth_user");
      expect(storedUser).toBeNull();
    });
  });

  describe("useSyncStore", () => {
    it("should reflect queue count and handle empty sync queue gracefully", async () => {
      await useSyncStore.getState().refreshPendingCount();
      expect(useSyncStore.getState().pendingCount).toBe(0);

      const success = await useSyncStore
        .getState()
        .syncWithServer("http://localhost:5000", "tok", "u-1");
      expect(success).toBe(true);
      expect(useSyncStore.getState().pendingCount).toBe(0);
    });

    it("should process sync items and remove processed mutations on server ack", async () => {
      await OfflineStore.enqueueMutation(
        "DAILY_RECORD",
        "CREATE",
        { mortalityCount: 2 },
        "sync-store-mut-1",
      );

      await useSyncStore.getState().refreshPendingCount();
      expect(useSyncStore.getState().pendingCount).toBe(1);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [
            {
              clientMutationId: "sync-store-mut-1",
              status: "synced",
              serverEntityId: "srv-rec-1",
            },
          ],
        }),
      } as any);

      const success = await useSyncStore
        .getState()
        .syncWithServer("http://localhost:5000", "tok", "u-1");
      expect(success).toBe(true);
      expect(useSyncStore.getState().pendingCount).toBe(0);
      expect(useSyncStore.getState().syncError).toBeNull();
    });

    it("should handle network failure gracefully without clearing queue", async () => {
      await OfflineStore.enqueueMutation(
        "EXPENSE",
        "CREATE",
        { amount: 500 },
        "mut-fail-1",
      );

      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error("Network request failed"));

      const success = await useSyncStore
        .getState()
        .syncWithServer("http://localhost:5000", "tok", "u-1");
      expect(success).toBe(false);
      expect(useSyncStore.getState().syncError).toBe("Network request failed");

      // Verify mutation is still in queue
      const queue = await OfflineStore.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].clientMutationId).toBe("mut-fail-1");
    });
  });
});
