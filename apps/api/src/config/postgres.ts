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
      max: 10,
      idleTimeoutMillis: 30000,
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

      console.log("[Neon Postgres] Initialized successfully. Table 'users' verified.");
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
}
