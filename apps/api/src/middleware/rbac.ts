import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { Batch } from '../models';

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthenticated' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    return;
  }
  next();
}

export async function requireShedAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthenticated' });
    return;
  }

  // Admins have unrestricted access to all sheds
  if (req.user.role === 'admin') {
    next();
    return;
  }

  // Workers are strictly bound to their assigned shed
  const assignedShedId = req.user.assignedShedId?.toString();
  if (!assignedShedId) {
    res.status(403).json({ success: false, error: 'Forbidden: Worker has no assigned shed' });
    return;
  }

  let requestedShedId = (req.params?.shedId || req.query?.shedId || req.body?.shedId) as string | undefined;

  // If a batchId is provided instead of shedId, lookup shedId from batch
  const requestedBatchId = (req.params?.batchId || req.query?.batchId || req.body?.batchId) as string | undefined;
  if (!requestedShedId && requestedBatchId) {
    const batch = await Batch.findById(requestedBatchId).select('shedId');
    if (batch) {
      requestedShedId = batch.shedId.toString();
    }
  }

  if (requestedShedId && requestedShedId !== assignedShedId) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: You are only authorized to access your assigned shed'
    });
    return;
  }

  next();
}
