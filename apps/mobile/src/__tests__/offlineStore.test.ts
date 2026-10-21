import { OfflineStore } from '../db/offlineStore';
import { SyncEntity, SyncAction } from '@broiler/shared';

describe('OfflineStore and Sync Queue', () => {
  beforeEach(async () => {
    await OfflineStore.clearAll();
  });

  it('starts with an empty queue and empty cache', async () => {
    const queue = await OfflineStore.getQueue();
    expect(queue).toEqual([]);
    const cachedRecords = await OfflineStore.getLocalCache('daily_record');
    expect(cachedRecords).toEqual([]);
  });

  it('enqueues mutations with unique client mutation IDs and timestamps', async () => {
    const item1 = await OfflineStore.enqueueMutation(
      'daily_record' as SyncEntity,
      'create' as SyncAction,
      { shedId: 'shed-1', date: '2026-10-21', mortality: 3 }
    );

    expect(item1.clientMutationId).toBeDefined();
    expect(item1.clientTimestamp).toBeDefined();
    expect(item1.entityType).toBe('daily_record');
    expect(item1.action).toBe('create');
    expect(item1.payload.mortality).toBe(3);

    const item2 = await OfflineStore.enqueueMutation(
      'vaccination' as SyncEntity,
      'update' as SyncAction,
      { taskId: 'vac-1', status: 'completed' }
    );

    const queue = await OfflineStore.getQueue();
    expect(queue.length).toBe(2);
    expect(queue[0].clientMutationId).toBe(item1.clientMutationId);
    expect(queue[1].clientMutationId).toBe(item2.clientMutationId);
  });

  it('removes processed mutations after sync succeeds', async () => {
    const item1 = await OfflineStore.enqueueMutation(
      'daily_record' as SyncEntity,
      'create' as SyncAction,
      { shedId: 'shed-1', date: '2026-10-21', mortality: 3 }
    );
    const item2 = await OfflineStore.enqueueMutation(
      'weight' as SyncEntity,
      'create' as SyncAction,
      { shedId: 'shed-1', week: 2, averageWeightGrams: 450 }
    );

    expect((await OfflineStore.getQueue()).length).toBe(2);

    // Remove only item1
    await OfflineStore.removeProcessedMutations([item1.clientMutationId]);
    const queueAfter = await OfflineStore.getQueue();
    expect(queueAfter.length).toBe(1);
    expect(queueAfter[0].clientMutationId).toBe(item2.clientMutationId);
  });

  it('updates and persists local entity cache with isOffline flag for immediate UX', async () => {
    await OfflineStore.updateLocalEntityCache('daily_record', {
      id: 'rec-1',
      date: '2026-10-21',
      mortality: 5,
      feedBagsUsed: 8
    });

    const cached = await OfflineStore.getLocalCache('daily_record');
    expect(cached.length).toBe(1);
    expect(cached[0].id).toBe('rec-1');
    expect(cached[0].isOffline).toBe(true);
    expect(cached[0].mortality).toBe(5);

    // Update same record
    await OfflineStore.updateLocalEntityCache('daily_record', {
      id: 'rec-1',
      date: '2026-10-21',
      mortality: 7,
      feedBagsUsed: 9
    });

    const cachedUpdated = await OfflineStore.getLocalCache('daily_record');
    expect(cachedUpdated.length).toBe(1);
    expect(cachedUpdated[0].mortality).toBe(7);
    expect(cachedUpdated[0].feedBagsUsed).toBe(9);
  });

  it('clears all queues and cached items cleanly', async () => {
    await OfflineStore.enqueueMutation('daily_record' as SyncEntity, 'create' as SyncAction, { test: 1 });
    await OfflineStore.updateLocalEntityCache('test_entity', { id: 'x', name: 'val' });

    expect((await OfflineStore.getQueue()).length).toBe(1);
    expect((await OfflineStore.getLocalCache('test_entity')).length).toBe(1);

    await OfflineStore.clearAll();

    expect((await OfflineStore.getQueue()).length).toBe(0);
    expect((await OfflineStore.getLocalCache('test_entity')).length).toBe(0);
  });
});
