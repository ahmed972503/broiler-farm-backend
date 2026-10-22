import * as SQLite from "expo-sqlite";
import {
  SyncItem,
  SyncEntity,
  SyncAction,
  SyncPacket,
  SyncResponse,
} from "@broiler/shared";

/**
 * Lightweight UUID v4 generator for React Native / Web
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ConflictLog {
  id: string;
  clientMutationId: string;
  entityType: string;
  conflictType: string;
  resolution: "client_wins" | "server_wins";
  localData: string;
  serverData: string;
  resolvedAt: string;
}

let dbInstance: any = null;

export class OfflineStore {
  /**
   * Initializes or returns the expo-sqlite database instance with tables
   */
  static async getDb(): Promise<any> {
    if (!dbInstance) {
      dbInstance = await SQLite.openDatabaseAsync("broiler_farm.db");
      await dbInstance.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS sync_queue (
          clientMutationId TEXT PRIMARY KEY,
          entityType TEXT NOT NULL,
          action TEXT NOT NULL,
          payload TEXT NOT NULL,
          clientTimestamp TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS entity_cache (
          key TEXT PRIMARY KEY,
          entityType TEXT NOT NULL,
          entityId TEXT NOT NULL,
          data TEXT NOT NULL,
          clientUpdatedAt TEXT NOT NULL,
          isOffline INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS conflict_audit_log (
          id TEXT PRIMARY KEY,
          clientMutationId TEXT NOT NULL,
          entityType TEXT NOT NULL,
          conflictType TEXT NOT NULL,
          resolution TEXT NOT NULL,
          localData TEXT NOT NULL,
          serverData TEXT NOT NULL,
          resolvedAt TEXT NOT NULL
        );
      `);
    }
    return dbInstance;
  }

  /**
   * Retrieves all currently pending sync mutations in FIFO sequence
   */
  static async getQueue(): Promise<SyncItem[]> {
    try {
      const db = await this.getDb();
      const rows = await db.getAllAsync(
        "SELECT clientMutationId, entityType, action, payload, clientTimestamp FROM sync_queue ORDER BY createdAt ASC",
      );
      return rows.map((r: any) => ({
        clientMutationId: r.clientMutationId,
        entityType: r.entityType as SyncEntity,
        action: r.action as SyncAction,
        payload:
          typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
        clientTimestamp: r.clientTimestamp,
      }));
    } catch (err) {
      console.warn("Error reading SQLite sync queue", err);
      return [];
    }
  }

  /**
   * Enqueues an offline mutation with duplicate prevention (idempotency)
   */
  static async enqueueMutation(
    entityType: SyncEntity,
    action: SyncAction,
    payload: any,
    customMutationId?: string,
  ): Promise<SyncItem> {
    const db = await this.getDb();
    const clientMutationId = customMutationId || generateUUID();
    const clientTimestamp = new Date().toISOString();
    const createdAt = Date.now();

    // Duplicate check: if mutation already exists in queue, return existing
    const existing = await db.getFirstAsync(
      "SELECT clientMutationId FROM sync_queue WHERE clientMutationId = ?",
      clientMutationId,
    );
    if (existing) {
      return {
        clientMutationId,
        entityType,
        action,
        payload,
        clientTimestamp,
      };
    }

    const payloadJson = JSON.stringify(payload);
    await db.runAsync(
      "INSERT INTO sync_queue (clientMutationId, entityType, action, payload, clientTimestamp, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      clientMutationId,
      entityType,
      action,
      payloadJson,
      clientTimestamp,
      createdAt,
    );

    // Also update local SQLite cache for immediate zero-latency display
    await this.updateLocalEntityCache(entityType, payload);

    return {
      clientMutationId,
      entityType,
      action,
      payload,
      clientTimestamp,
    };
  }

  /**
   * Removes processed items from the SQLite sync queue
   */
  static async removeProcessedMutations(mutationIds: string[]): Promise<void> {
    if (!mutationIds || mutationIds.length === 0) return;
    const db = await this.getDb();
    for (const id of mutationIds) {
      await db.runAsync(
        "DELETE FROM sync_queue WHERE clientMutationId = ?",
        id,
      );
    }
  }

  /**
   * Last-Write-Wins (LWW) conflict resolver comparing client vs server timestamps
   */
  static async resolveConflict(
    clientMutation: SyncItem,
    serverEntity: {
      updatedAt?: string;
      clientUpdatedAt?: string;
      [key: string]: any;
    },
  ): Promise<{
    resolution: "client_wins" | "server_wins";
    effectiveData: any;
  }> {
    const db = await this.getDb();
    const clientTime = new Date(clientMutation.clientTimestamp).getTime();
    const serverTime = new Date(
      serverEntity.updatedAt || serverEntity.clientUpdatedAt || 0,
    ).getTime();

    let resolution: "client_wins" | "server_wins" = "client_wins";
    let effectiveData = clientMutation.payload;

    if (serverTime > clientTime) {
      resolution = "server_wins";
      effectiveData = serverEntity;
    }

    // Record audit trail in conflict log table
    const logId = generateUUID();
    await db.runAsync(
      "INSERT INTO conflict_audit_log (id, clientMutationId, entityType, conflictType, resolution, localData, serverData, resolvedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      logId,
      clientMutation.clientMutationId,
      clientMutation.entityType,
      "TIMESTAMP_CONCURRENCY",
      resolution,
      JSON.stringify(clientMutation.payload),
      JSON.stringify(serverEntity),
      new Date().toISOString(),
    );

    // Update local cache with winning data
    await this.updateLocalEntityCache(
      clientMutation.entityType,
      effectiveData,
      false,
    );

    return { resolution, effectiveData };
  }

  /**
   * Retrieves all conflict audit logs
   */
  static async getConflictLogs(): Promise<ConflictLog[]> {
    try {
      const db = await this.getDb();
      return await db.getAllAsync(
        "SELECT * FROM conflict_audit_log ORDER BY resolvedAt DESC",
      );
    } catch {
      return [];
    }
  }

  /**
   * Caches entities locally in SQLite so worker views data with zero network
   */
  static async updateLocalEntityCache(
    entityType: string,
    payload: any,
    isOffline: boolean = true,
  ): Promise<void> {
    try {
      const db = await this.getDb();
      const entityId =
        payload.id ||
        payload._id ||
        payload.date ||
        payload.taskId ||
        generateUUID();
      const key = `${entityType}_${entityId}`;
      const dataJson = JSON.stringify({ ...payload, isOffline });
      const clientUpdatedAt =
        payload.clientUpdatedAt || new Date().toISOString();

      await db.runAsync(
        "INSERT OR REPLACE INTO entity_cache (key, entityType, entityId, data, clientUpdatedAt, isOffline) VALUES (?, ?, ?, ?, ?, ?)",
        key,
        entityType,
        String(entityId),
        dataJson,
        clientUpdatedAt,
        isOffline ? 1 : 0,
      );
    } catch (err) {
      console.warn("SQLite local cache write failed", err);
    }
  }

  /**
   * Gets locally cached records from SQLite for offline viewing
   */
  static async getLocalCache<T = any>(entityType: string): Promise<T[]> {
    try {
      const db = await this.getDb();
      const rows = await db.getAllAsync(
        "SELECT data FROM entity_cache WHERE entityType = ? ORDER BY clientUpdatedAt DESC",
        entityType,
      );
      return rows.map((r: any) => JSON.parse(r.data));
    } catch {
      return [];
    }
  }

  /**
   * Clears the entire queue and cache
   */
  static async clearAll(): Promise<void> {
    try {
      const db = await this.getDb();
      await db.runAsync("DELETE FROM sync_queue");
      await db.runAsync("DELETE FROM entity_cache");
      await db.runAsync("DELETE FROM conflict_audit_log");
    } catch (err) {
      console.error("Clear SQLite store error", err);
    }
  }
}
