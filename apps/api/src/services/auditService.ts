import mongoose from 'mongoose';
import { AuditLog } from '../models';
import { AuditAction } from '@broiler/shared';

export async function logAuditEvent(params: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: mongoose.Types.ObjectId | string;
  previousState?: any;
  newState?: any;
}): Promise<void> {
  try {
    await AuditLog.create({
      entityType: params.entityType,
      entityId: params.entityId.toString(),
      action: params.action,
      performedBy: new mongoose.Types.ObjectId(params.performedBy.toString()),
      previousState: params.previousState || null,
      newState: params.newState || null,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('[AuditLog Error]: Failed to create audit log', err);
  }
}
