import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { config } from "./index";

let pool: Pool | null = null;

export function getPostgresPool(): Pool | null {
  const url = config.databaseUrl;
  if (!url) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: process.env.VERCEL ? 3 : 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    pool.on("error", (err) => {
      console.error("[Neon Postgres] Pool error:", err);
    });
  }
  return pool;
}

export async function initNeonDatabase(): Promise<void> {
  const p = getPostgresPool();
  if (!p) {
    console.log("[Neon Postgres] DATABASE_URL not set, skipping Neon initialization.");
    return;
  }

  try {
    const client = await p.connect();
    try {
      // 1. Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          username VARCHAR(64) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(128) NOT NULL,
          phone VARCHAR(32) NOT NULL,
          role VARCHAR(32) NOT NULL,
          assigned_shed_id VARCHAR(64),
          refresh_token TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Ensure initial admin and worker users exist (NO seed/dummy farm data)
      const adminExists = await client.query(
        "SELECT id FROM users WHERE username = $1",
        ["admin"]
      );
      if (adminExists.rows.length === 0) {
        const adminHash = await bcrypt.hash("admin123", 10);
        await client.query(
          `INSERT INTO users (id, username, password_hash, name, phone, role, is_active)
           VALUES ('user_admin_001', 'admin', $1, 'Haji Muhammad Ahmed', '03001234567', 'admin', true)`,
          [adminHash]
        );
        console.log("[Neon Postgres] Created default admin account (username: admin)");
      }

      const workerExists = await client.query(
        "SELECT id FROM users WHERE username = $1",
        ["worker1"]
      );
      if (workerExists.rows.length === 0) {
        const workerHash = await bcrypt.hash("worker123", 10);
        await client.query(
          `INSERT INTO users (id, username, password_hash, name, phone, role, is_active)
           VALUES ('user_worker_001', 'worker1', $1, 'Bashir Ahmed', '03019876543', 'worker', true)`,
          [workerHash]
        );
        console.log("[Neon Postgres] Created default worker account (username: worker1)");
      }

      // 3. Create sheds table in Neon Postgres
      await client.query(`
        CREATE TABLE IF NOT EXISTS sheds (
          id VARCHAR(64) PRIMARY KEY,
          shed_number INT UNIQUE NOT NULL,
          name VARCHAR(128) NOT NULL,
          capacity INT NOT NULL DEFAULT 5000,
          assigned_worker_id VARCHAR(64),
          current_batch_id VARCHAR(64),
          status VARCHAR(32) DEFAULT 'active',
          notes TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed initial 5 sheds if none exist
      const shedsCountRes = await client.query("SELECT COUNT(*) FROM sheds");
      const shedsCount = parseInt(shedsCountRes.rows[0].count, 10);
      if (shedsCount === 0) {
        for (let i = 1; i <= 5; i++) {
          const workerId = i === 1 ? "user_worker_001" : null;
          await client.query(
            `INSERT INTO sheds (id, shed_number, name, capacity, assigned_worker_id, status)
             VALUES ($1, $2, $3, $4, $5, 'active')`,
            [`shed_00${i}`, i, `Shed ${i}`, 5000, workerId]
          );
        }
        console.log("[Neon Postgres] Seeded initial 5 sheds (Shed 1 to 5)");
      }

      console.log("[Neon Postgres] Initialized successfully. Tables 'users' and 'sheds' verified.");
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[Neon Postgres] Initialization failed:", err.message);
  }
}

export interface NeonUser {
  id: string;
  _id?: string;
  username: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: string;
  assignedShedId?: string | null;
  refreshToken?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NeonUserRepository {
  static async findByUsername(username: string): Promise<NeonUser | null> {
    const p = getPostgresPool();
    if (!p) return null;
    const res = await p.query(
      `SELECT id, username, password_hash as "passwordHash", name, phone, role, 
              assigned_shed_id as "assignedShedId", refresh_token as "refreshToken", 
              is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [username.trim()]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return { ...row, _id: row.id };
  }

  static async findById(id: string): Promise<NeonUser | null> {
    const p = getPostgresPool();
    if (!p) return null;
    const res = await p.query(
      `SELECT id, username, password_hash as "passwordHash", name, phone, role, 
              assigned_shed_id as "assignedShedId", refresh_token as "refreshToken", 
              is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return { ...row, _id: row.id };
  }

  static async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    const p = getPostgresPool();
    if (!p) return;
    await p.query(
      `UPDATE users SET refresh_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [refreshToken, id]
    );
  }

  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    const p = getPostgresPool();
    if (!p) return;
    await p.query(
      `UPDATE users SET password_hash = $1, refresh_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [passwordHash, id]
    );
  }

  static async findAll(): Promise<NeonUser[]> {
    const p = getPostgresPool();
    if (!p) return [];
    const res = await p.query(
      `SELECT id, username, password_hash as "passwordHash", name, phone, role, 
              assigned_shed_id as "assignedShedId", refresh_token as "refreshToken", 
              is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM users ORDER BY created_at ASC`
    );
    return res.rows.map((row) => ({ ...row, _id: row.id }));
  }

  static async create(user: {
    id?: string;
    username: string;
    passwordHash: string;
    name: string;
    phone: string;
    role: string;
    assignedShedId?: string | null;
  }): Promise<NeonUser> {
    const p = getPostgresPool();
    if (!p) throw new Error("Neon Postgres pool not initialized");
    const id = user.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const res = await p.query(
      `INSERT INTO users (id, username, password_hash, name, phone, role, assigned_shed_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, username, password_hash as "passwordHash", name, phone, role, 
                 assigned_shed_id as "assignedShedId", refresh_token as "refreshToken", 
                 is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, user.username.toLowerCase().trim(), user.passwordHash, user.name, user.phone, user.role, user.assignedShedId || null]
    );
    const row = res.rows[0];
    return { ...row, _id: row.id };
  }

  static async assignShed(userId: string, shedId: string | null): Promise<void> {
    const p = getPostgresPool();
    if (!p) return;
    await p.query(
      `UPDATE users SET assigned_shed_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [shedId, userId]
    );
  }
}

export interface NeonShed {
  id: string;
  _id?: string;
  shedNumber: number;
  name: string;
  capacity: number;
  assignedWorkerId?: any;
  currentBatchId?: string | null;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NeonShedRepository {
  static async findAll(workerId?: string): Promise<any[]> {
    const p = getPostgresPool();
    if (!p) return [];
    let query = `
      SELECT s.id, s.id as "_id", s.shed_number as "shedNumber", s.name, s.capacity, 
             s.assigned_worker_id as "assignedWorkerId", s.current_batch_id as "currentBatchId", 
             s.status, s.notes, s.created_at as "createdAt", s.updated_at as "updatedAt",
             u.id as "w_id", u.name as "w_name", u.phone as "w_phone", u.username as "w_username"
      FROM sheds s
      LEFT JOIN users u ON s.assigned_worker_id = u.id
    `;
    const params: any[] = [];
    if (workerId) {
      query += ` WHERE s.assigned_worker_id = $1`;
      params.push(workerId);
    }
    query += ` ORDER BY s.shed_number ASC`;
    const res = await p.query(query, params);
    return res.rows.map((r) => ({
      _id: r.id,
      id: r.id,
      shedNumber: r.shedNumber,
      name: r.name,
      capacity: r.capacity,
      status: r.status,
      notes: r.notes,
      assignedWorkerId: r.w_id
        ? { _id: r.w_id, id: r.w_id, name: r.w_name, phone: r.w_phone, username: r.w_username }
        : null,
      currentBatchId: r.currentBatchId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  static async findById(id: string): Promise<any | null> {
    const p = getPostgresPool();
    if (!p) return null;
    const res = await p.query(
      `SELECT s.id, s.id as "_id", s.shed_number as "shedNumber", s.name, s.capacity, 
              s.assigned_worker_id as "assignedWorkerId", s.current_batch_id as "currentBatchId", 
              s.status, s.notes, s.created_at as "createdAt", s.updated_at as "updatedAt",
              u.id as "w_id", u.name as "w_name", u.phone as "w_phone", u.username as "w_username"
       FROM sheds s
       LEFT JOIN users u ON s.assigned_worker_id = u.id
       WHERE s.id = $1 LIMIT 1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      _id: r.id,
      id: r.id,
      shedNumber: r.shedNumber,
      name: r.name,
      capacity: r.capacity,
      status: r.status,
      notes: r.notes,
      assignedWorkerId: r.w_id
        ? { _id: r.w_id, id: r.w_id, name: r.w_name, phone: r.w_phone, username: r.w_username }
        : null,
      currentBatchId: r.currentBatchId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  static async create(shed: {
    name?: string;
    capacity?: number;
    assignedWorkerId?: string | null;
    notes?: string;
  }): Promise<any> {
    const p = getPostgresPool();
    if (!p) throw new Error("Neon Postgres pool not initialized");
    const maxNumRes = await p.query("SELECT COALESCE(MAX(shed_number), 0) + 1 as next_num FROM sheds");
    const nextNum = parseInt(maxNumRes.rows[0].next_num, 10);
    const id = `shed_00${nextNum}_${Date.now()}`;
    const name = shed.name?.trim() || `Shed ${nextNum}`;
    const capacity = shed.capacity || 5000;
    const assignedWorkerId = shed.assignedWorkerId || null;

    const res = await p.query(
      `INSERT INTO sheds (id, shed_number, name, capacity, assigned_worker_id, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, shed_number as "shedNumber", name, capacity, assigned_worker_id as "assignedWorkerId", status`,
      [id, nextNum, name, capacity, assignedWorkerId, shed.notes || ""]
    );

    if (assignedWorkerId) {
      await p.query("UPDATE users SET assigned_shed_id = $1 WHERE id = $2", [id, assignedWorkerId]);
    }

    return { ...res.rows[0], _id: res.rows[0].id };
  }

  static async assignWorker(shedId: string, workerId: string | null): Promise<void> {
    const p = getPostgresPool();
    if (!p) return;
    await p.query(
      `UPDATE sheds SET assigned_worker_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [workerId, shedId]
    );
    if (workerId) {
      await p.query(
        `UPDATE users SET assigned_shed_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [shedId, workerId]
      );
    }
  }

  static async update(id: string, updates: any): Promise<any> {
    const p = getPostgresPool();
    if (!p) return null;
    if (updates.assignedWorkerId !== undefined) {
      await this.assignWorker(id, updates.assignedWorkerId);
    }
    const current = await this.findById(id);
    if (!current) return null;
    const name = updates.name !== undefined ? updates.name : current.name;
    const capacity = updates.capacity !== undefined ? updates.capacity : current.capacity;
    const status = updates.status !== undefined ? updates.status : current.status;
    const notes = updates.notes !== undefined ? updates.notes : current.notes;
    await p.query(
      `UPDATE sheds SET name = $1, capacity = $2, status = $3, notes = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
      [name, capacity, status, notes, id]
    );
    return await this.findById(id);
  }
}
