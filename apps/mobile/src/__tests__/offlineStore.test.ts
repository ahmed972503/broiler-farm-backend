import { OfflineStore } from "../db/offlineStore";
import { SyncEntity, SyncAction, SyncItem } from "@broiler/shared";

describe("expo-sqlite Offline Store & Sync Queue Tests", () => {
  beforeEach(async () => {
    await OfflineStore.clearAll();
  });

  it("starts with an empty SQLite queue and empty cache", async () => {
    const queue = await OfflineStore.getQueue();
    expect(queue).toEqual([]);
    const cachedRecords = await OfflineStore.getLocalCache("daily_record");
    expect(cachedRecords).toEqual([]);
  });

  it("enqueues offline writes with UUID v4 mutation IDs and ISO timestamps", async () => {
    const item1 = await OfflineStore.enqueueMutation(
      "daily_record" as SyncEntity,
      "create" as SyncAction,
      { shedId: "shed-1", date: "2026-10-22", mortality: 3, feedBags: 8 },
    );

    expect(item1.clientMutationId).toBeDefined();
    expect(item1.clientTimestamp).toBeDefined();
    expect(item1.entityType).toBe("daily_record");
    expect(item1.action).toBe("create");
    expect(item1.payload.mortality).toBe(3);

    const item2 = await OfflineStore.enqueueMutation(
      "vaccination" as SyncEntity,
      "update" as SyncAction,
      { taskId: "vac-101", status: "completed" },
    );

    const queue = await OfflineStore.getQueue();
    expect(queue.length).toBe(2);
    expect(queue[0].clientMutationId).toBe(item1.clientMutationId);
    expect(queue[1].clientMutationId).toBe(item2.clientMutationId);
  });

  it("enforces duplicate prevention (idempotency) when duplicate mutation ID is enqueued", async () => {
    const duplicateId = "fixed-mutation-uuid-001";

    // First enqueue
    const item1 = await OfflineStore.enqueueMutation(
      "daily_record" as SyncEntity,
      "create" as SyncAction,
      { shedId: "shed-1", mortality: 5 },
      duplicateId,
    );

    // Duplicate enqueue with same ID
    const item2 = await OfflineStore.enqueueMutation(
      "daily_record" as SyncEntity,
      "create" as SyncAction,
      { shedId: "shed-1", mortality: 5 },
      duplicateId,
    );

    expect(item1.clientMutationId).toBe(duplicateId);
    expect(item2.clientMutationId).toBe(duplicateId);

    // Queue must still have only 1 item
    const queue = await OfflineStore.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].clientMutationId).toBe(duplicateId);
  });

  it("removes processed mutations from SQLite queue upon reconnect sync", async () => {
    const item1 = await OfflineStore.enqueueMutation(
      "daily_record" as SyncEntity,
      "create" as SyncAction,
      { shedId: "shed-1", mortality: 3 },
    );
    const item2 = await OfflineStore.enqueueMutation(
      "weight" as SyncEntity,
      "create" as SyncAction,
      { shedId: "shed-1", week: 2, avgWeightGrams: 420 },
    );

    expect((await OfflineStore.getQueue()).length).toBe(2);

    // Server acknowledged item1
    await OfflineStore.removeProcessedMutations([item1.clientMutationId]);

    const remainingQueue = await OfflineStore.getQueue();
    expect(remainingQueue.length).toBe(1);
    expect(remainingQueue[0].clientMutationId).toBe(item2.clientMutationId);
  });

  describe("Conflict Resolution (Last-Write-Wins & Audit Trail)", () => {
    it("client mutation wins when local timestamp is newer than server timestamp", async () => {
      const clientMutation: SyncItem = {
        clientMutationId: "mut-newer-client-1",
        entityType: "daily_record" as SyncEntity,
        action: "update" as SyncAction,
        payload: { id: "rec-1", mortalityCount: 6, feedUsedBags: 9 },
        clientTimestamp: "2026-10-22T10:15:00.000Z",
      };

      const serverEntity = {
        id: "rec-1",
        mortalityCount: 4,
        feedUsedBags: 8,
        updatedAt: "2026-10-22T09:00:00.000Z", // Older than client
      };

      const result = await OfflineStore.resolveConflict(
        clientMutation,
        serverEntity,
      );

      expect(result.resolution).toBe("client_wins");
      expect(result.effectiveData.mortalityCount).toBe(6);

      // Verify conflict logged in SQLite
      const conflictLogs = await OfflineStore.getConflictLogs();
      expect(conflictLogs.length).toBe(1);
      expect(conflictLogs[0].resolution).toBe("client_wins");
      expect(conflictLogs[0].clientMutationId).toBe("mut-newer-client-1");
    });

    it("server entity wins when server timestamp is newer than local offline timestamp", async () => {
      const clientMutation: SyncItem = {
        clientMutationId: "mut-older-client-2",
        entityType: "daily_record" as SyncEntity,
        action: "update" as SyncAction,
        payload: { id: "rec-1", mortalityCount: 3, feedUsedBags: 7 },
        clientTimestamp: "2026-10-22T08:00:00.000Z", // Older than server
      };

      const serverEntity = {
        id: "rec-1",
        mortalityCount: 5,
        feedUsedBags: 8,
        updatedAt: "2026-10-22T11:00:00.000Z", // Newer than client
      };

      const result = await OfflineStore.resolveConflict(
        clientMutation,
        serverEntity,
      );

      expect(result.resolution).toBe("server_wins");
      expect(result.effectiveData.mortalityCount).toBe(5);

      const conflictLogs = await OfflineStore.getConflictLogs();
      expect(conflictLogs.length).toBe(1);
      expect(conflictLogs[0].resolution).toBe("server_wins");
    });
  });

  it("persists and retrieves locally cached entities with offline flags", async () => {
    await OfflineStore.updateLocalEntityCache("daily_record", {
      id: "rec-100",
      date: "2026-10-22",
      mortalityCount: 4,
      feedBags: 10,
    });

    const cached = await OfflineStore.getLocalCache("daily_record");
    expect(cached.length).toBe(1);
    expect(cached[0].id).toBe("rec-100");
    expect(cached[0].isOffline).toBe(true);
    expect(cached[0].mortalityCount).toBe(4);
  });
});
