import { getPostgresPool } from "./postgres";

export interface DocumentLike {
  id: string;
  _id: string;
  [key: string]: any;
  toObject?: () => any;
  toJSON?: () => any;
  save?: () => Promise<any>;
}

export function matchDoc(doc: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  if (!doc) return false;

  for (const [key, val] of Object.entries(filter)) {
    if (key === "$or" && Array.isArray(val)) {
      if (!val.some((sub) => matchDoc(doc, sub))) return false;
      continue;
    }
    if (key === "$and" && Array.isArray(val)) {
      if (!val.every((sub) => matchDoc(doc, sub))) return false;
      continue;
    }

    // Support dot-notation keys like "newState.clientMutationId"
    let docVal: any = doc;
    if (key.includes(".")) {
      const parts = key.split(".");
      for (const p of parts) {
        docVal = docVal ? docVal[p] : undefined;
      }
    } else if (key === "_id" || key === "id") {
      docVal = doc.id || doc._id;
    } else {
      docVal = doc[key];
    }

    if (val === null || val === undefined) {
      if (docVal !== null && docVal !== undefined) return false;
      continue;
    }

    if (val instanceof RegExp) {
      if (!val.test(String(docVal || ""))) return false;
      continue;
    }

    if (typeof val === "object" && !(val instanceof Date)) {
      const vObj = val as any;
      if (vObj.$in && Array.isArray(vObj.$in)) {
        const inList = vObj.$in.map((v: any) => String(v));
        if (!inList.includes(String(docVal))) return false;
        continue;
      }
      if (vObj.$nin && Array.isArray(vObj.$nin)) {
        const ninList = vObj.$nin.map((v: any) => String(v));
        if (ninList.includes(String(docVal))) return false;
        continue;
      }
      if (vObj.$gte !== undefined) {
        const dVal = typeof docVal === "number" ? docVal : Number(docVal) || docVal;
        const vGte = typeof vObj.$gte === "number" ? vObj.$gte : Number(vObj.$gte) || vObj.$gte;
        if (dVal < vGte) return false;
      }
      if (vObj.$lte !== undefined) {
        const dVal = typeof docVal === "number" ? docVal : Number(docVal) || docVal;
        const vLte = typeof vObj.$lte === "number" ? vObj.$lte : Number(vObj.$lte) || vObj.$lte;
        if (dVal > vLte) return false;
      }
      if (vObj.$gt !== undefined) {
        const dVal = typeof docVal === "number" ? docVal : Number(docVal) || docVal;
        const vGt = typeof vObj.$gt === "number" ? vObj.$gt : Number(vObj.$gt) || vObj.$gt;
        if (dVal <= vGt) return false;
      }
      if (vObj.$lt !== undefined) {
        const dVal = typeof docVal === "number" ? docVal : Number(docVal) || docVal;
        const vLt = typeof vObj.$lt === "number" ? vObj.$lt : Number(vObj.$lt) || vObj.$lt;
        if (dVal >= vLt) return false;
      }
      if (vObj.$ne !== undefined) {
        if (String(docVal) === String(vObj.$ne)) return false;
      }
      if (vObj.$regex !== undefined) {
        const rx = new RegExp(vObj.$regex, vObj.$options || "i");
        if (!rx.test(String(docVal || ""))) return false;
      }
      continue;
    }

    // Direct value comparison
    if (String(docVal) !== String(val)) {
      return false;
    }
  }

  return true;
}

export class NeonQuery<T = any> implements PromiseLike<T> {
  private tableName: string;
  private filter: any;
  private isSingle: boolean;
  private sortObj: any = null;
  private limitNum: number = 0;
  private skipNum: number = 0;
  private populateList: Array<{ path: string; select?: string }> = [];

  constructor(tableName: string, filter: any = {}, isSingle: boolean = false) {
    this.tableName = tableName;
    this.filter = filter;
    this.isSingle = isSingle;
  }

  sort(sortObj: any): this {
    this.sortObj = sortObj;
    return this;
  }

  limit(n: number): this {
    this.limitNum = n;
    return this;
  }

  skip(n: number): this {
    this.skipNum = n;
    return this;
  }

  select(_fields: any): this {
    return this;
  }

  populate(path: string, select?: string): this {
    this.populateList.push({ path, select });
    return this;
  }

  lean(): this {
    return this;
  }

  async exec(): Promise<any> {
    const p = getPostgresPool();
    if (!p) {
      return this.isSingle ? null : [];
    }

    // 1. Fetch rows from table
    let rows: any[] = [];
    if (this.tableName === "users") {
      const res = await p.query(`
        SELECT u.id, u.username, u.password_hash as "passwordHash", u.name, u.phone, u.role, 
               u.assigned_shed_id as "assignedShedId", u.refresh_token as "refreshToken", 
               u.is_active as "isActive", u.created_at as "createdAt", u.updated_at as "updatedAt",
               s.name as "shedName", s.shed_number as "shedNumber"
        FROM users u
        LEFT JOIN sheds s ON u.assigned_shed_id = s.id
        ORDER BY u.created_at ASC
      `);
      rows = res.rows.map((r) => ({
        ...r,
        _id: r.id,
        assignedShedId: r.assignedShedId
          ? { _id: r.assignedShedId, id: r.assignedShedId, name: r.shedName || "Shed", shedNumber: r.shedNumber }
          : null,
      }));
    } else if (this.tableName === "sheds") {
      const res = await p.query(`
        SELECT s.id, s.id as "_id", s.shed_number as "shedNumber", s.name, s.capacity, 
               s.assigned_worker_id as "assignedWorkerId", s.current_batch_id as "currentBatchId", 
               s.status, s.notes, s.created_at as "createdAt", s.updated_at as "updatedAt",
               u.id as "w_id", u.name as "w_name", u.phone as "w_phone", u.username as "w_username"
        FROM sheds s
        LEFT JOIN users u ON s.assigned_worker_id = u.id
        ORDER BY s.shed_number ASC
      `);
      rows = res.rows.map((r) => ({
        ...r,
        assignedWorkerId: r.w_id
          ? { _id: r.w_id, id: r.w_id, name: r.w_name, phone: r.w_phone, username: r.w_username }
          : null,
      }));
    } else {
      const res = await p.query(`SELECT id, data, created_at, updated_at FROM ${this.tableName} ORDER BY created_at DESC`);
      rows = res.rows.map((r) => ({
        ...r.data,
        id: r.id,
        _id: r.id,
        createdAt: r.created_at || r.data?.createdAt || new Date(),
        updatedAt: r.updated_at || r.data?.updatedAt || new Date(),
      }));
    }

    // 2. Filter in memory
    let docs = rows.filter((d) => matchDoc(d, this.filter));

    // 3. Sort
    if (this.sortObj) {
      const entries = Object.entries(this.sortObj);
      docs.sort((a, b) => {
        for (const [key, dir] of entries) {
          const mult = dir === -1 || dir === "desc" || dir === "descending" ? -1 : 1;
          const aVal = a[key];
          const bVal = b[key];
          if (aVal !== bVal) {
            if (aVal === undefined || aVal === null) return 1 * mult;
            if (bVal === undefined || bVal === null) return -1 * mult;
            if (typeof aVal === "number" && typeof bVal === "number") {
              return (aVal - bVal) * mult;
            }
            return String(aVal).localeCompare(String(bVal)) * mult;
          }
        }
        return 0;
      });
    }

    // 4. Skip & Limit
    if (this.skipNum > 0) {
      docs = docs.slice(this.skipNum);
    }
    if (this.limitNum > 0) {
      docs = docs.slice(0, this.limitNum);
    }

    // 5. Populate
    if (this.populateList.length > 0) {
      for (const pop of this.populateList) {
        for (const doc of docs) {
          const val = doc[pop.path];
          const id = val && typeof val === "object" ? val.id || val._id : val;
          if (id && typeof id === "string") {
            if (pop.path === "createdBy" || pop.path === "recordedBy" || pop.path === "assignedWorkerId" || pop.path === "userId") {
              const uRes = await p.query("SELECT id, name, phone, username, role FROM users WHERE id = $1 LIMIT 1", [id]);
              if (uRes.rows.length > 0) {
                const u = uRes.rows[0];
                doc[pop.path] = { ...u, _id: u.id };
              }
            } else if (pop.path === "shedId" || pop.path === "assignedShedId") {
              const sRes = await p.query("SELECT id, name, shed_number, capacity FROM sheds WHERE id = $1 LIMIT 1", [id]);
              if (sRes.rows.length > 0) {
                const s = sRes.rows[0];
                doc[pop.path] = { ...s, _id: s.id, shedNumber: s.shed_number };
              }
            }
          }
        }
      }
    }

    // 6. Wrap with document methods (.save, .toObject, .toJSON)
    const wrapped = docs.map((d) => wrapDocument(this.tableName, d));

    if (this.isSingle) {
      return wrapped.length > 0 ? wrapped[0] : null;
    }
    return wrapped;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

function wrapDocument(tableName: string, data: any): DocumentLike {
  const doc: DocumentLike = {
    ...data,
    id: data.id || data._id,
    _id: data.id || data._id,
  };

  doc.toObject = function () {
    const copy: any = { ...this };
    delete copy.toObject;
    delete copy.toJSON;
    delete copy.save;
    return copy;
  };

  doc.toJSON = function () {
    return this.toObject ? this.toObject() : { ...this };
  };

  doc.save = async function () {
    const p = getPostgresPool();
    if (!p) return this;
    const clean = this.toObject ? this.toObject() : { ...this };

    if (tableName === "users") {
      await p.query(
        `UPDATE users SET name = $1, phone = $2, role = $3, assigned_shed_id = $4, 
                          refresh_token = $5, is_active = $6,
                          password_hash = CASE WHEN $7::text IS NOT NULL AND $7::text <> '' THEN $7::text ELSE password_hash END,
                          updated_at = CURRENT_TIMESTAMP 
         WHERE id = $8`,
        [
          clean.name,
          clean.phone,
          clean.role,
          clean.assignedShedId?.id || clean.assignedShedId?._id || clean.assignedShedId || null,
          clean.refreshToken || null,
          clean.isActive !== undefined ? clean.isActive : true,
          clean.passwordHash || null,
          this.id,
        ]
      );
    } else if (tableName === "sheds") {
      await p.query(
        `UPDATE sheds SET name = $1, capacity = $2, assigned_worker_id = $3, 
                          current_batch_id = $4, status = $5, notes = $6, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $7`,
        [
          clean.name,
          clean.capacity || 5000,
          clean.assignedWorkerId?.id || clean.assignedWorkerId?._id || clean.assignedWorkerId || null,
          clean.currentBatchId || null,
          clean.status || "active",
          clean.notes || "",
          this.id,
        ]
      );
    } else {
      await p.query(
        `UPDATE ${tableName} SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [JSON.stringify(clean), this.id]
      );
    }
    return this;
  };

  return doc;
}

export class NeonModel<T = any> {
  public tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  find(filter: any = {}): NeonQuery<T[]> {
    return new NeonQuery<T[]>(this.tableName, filter, false);
  }

  findOne(filter: any = {}): NeonQuery<T | null> {
    return new NeonQuery<T | null>(this.tableName, filter, true);
  }

  findById(id: any): NeonQuery<T | null> {
    const cleanId = id && typeof id === "object" ? id.toString() : id;
    return new NeonQuery<T | null>(this.tableName, { id: cleanId }, true);
  }

  async countDocuments(filter: any = {}): Promise<number> {
    const results = await this.find(filter);
    return (results as any).length;
  }

  async create(data: any): Promise<any> {
    const p = getPostgresPool();
    if (!p) throw new Error("Neon Postgres pool not initialized");

    if (Array.isArray(data)) {
      const created = [];
      for (const item of data) {
        created.push(await this.create(item));
      }
      return created;
    }

    const id = data.id || data._id || `${this.tableName.replace(/s$/, "")}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docData = { ...data, id, _id: id, createdAt: new Date(), updatedAt: new Date() };

    if (this.tableName === "users") {
      const res = await p.query(
        `INSERT INTO users (id, username, password_hash, name, phone, role, assigned_shed_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id`,
        [id, docData.username?.toLowerCase().trim(), docData.passwordHash || "", docData.name, docData.phone, docData.role || "worker", docData.assignedShedId || null]
      );
      return wrapDocument("users", { ...docData, id: res.rows[0].id });
    } else if (this.tableName === "sheds") {
      const maxRes = await p.query("SELECT COALESCE(MAX(shed_number), 0) + 1 as next_num FROM sheds");
      const nextNum = docData.shedNumber || parseInt(maxRes.rows[0].next_num, 10);
      const res = await p.query(
        `INSERT INTO sheds (id, shed_number, name, capacity, assigned_worker_id, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [id, nextNum, docData.name || `Shed ${nextNum}`, docData.capacity || 5000, docData.assignedWorkerId || null, docData.notes || "", docData.status || "active"]
      );
      return wrapDocument("sheds", { ...docData, id: res.rows[0].id });
    } else {
      // JSONB table
      await p.query(
        `INSERT INTO ${this.tableName} (id, data, created_at, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [id, JSON.stringify(docData)]
      );
      return wrapDocument(this.tableName, docData);
    }
  }

  async insertMany(docs: any[]): Promise<any[]> {
    return this.create(docs);
  }

  async findByIdAndUpdate(id: any, update: any, options: any = { new: true }): Promise<any> {
    const doc: any = await this.findById(id);
    if (!doc) return null;

    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        doc[k] = (Number(doc[k]) || 0) + Number(v);
      }
    }

    const changes = update.$set ? { ...update.$set } : { ...update };
    delete changes.$set;
    delete changes.$inc;

    Object.assign(doc, changes);
    await doc.save();
    return options.new === false ? doc : doc;
  }

  async findOneAndUpdate(filter: any, update: any, options: any = { new: true }): Promise<any> {
    const doc: any = await this.findOne(filter);
    if (!doc) return null;

    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        doc[k] = (Number(doc[k]) || 0) + Number(v);
      }
    }

    const changes = update.$set ? { ...update.$set } : { ...update };
    delete changes.$set;
    delete changes.$inc;

    Object.assign(doc, changes);
    await doc.save();
    return options.new === false ? doc : doc;
  }

  async updateMany(filter: any = {}, update: any = {}): Promise<{ modifiedCount: number }> {
    const docs: any[] = (await this.find(filter)) as any[];
    for (const doc of docs) {
      if (update.$set) {
        Object.assign(doc, update.$set);
      } else {
        Object.assign(doc, update);
      }
      if (doc.save) await doc.save();
    }
    return { modifiedCount: docs.length };
  }

  async findByIdAndDelete(id: any): Promise<any> {
    const doc: any = await this.findById(id);
    if (!doc) return null;
    const p = getPostgresPool();
    if (p) {
      await p.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [doc.id]);
    }
    return doc;
  }

  async deleteMany(filter: any = {}): Promise<{ deletedCount: number }> {
    const docs: any[] = (await this.find(filter)) as any[];
    const p = getPostgresPool();
    if (!p || docs.length === 0) return { deletedCount: 0 };
    for (const d of docs) {
      await p.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [d.id]);
    }
    return { deletedCount: docs.length };
  }

  async distinct(field: string, filter: any = {}): Promise<any[]> {
    const docs: any[] = (await this.find(filter)) as any[];
    const values = new Set<any>();
    for (const d of docs) {
      if (d[field] !== undefined && d[field] !== null) {
        values.add(d[field]);
      }
    }
    return Array.from(values);
  }

  async aggregate(pipeline: any[] = []): Promise<any[]> {
    // Basic aggregation support for $match, $group, $sort
    let docs: any[] = (await this.find()) as any[];
    for (const stage of pipeline) {
      if (stage.$match) {
        docs = docs.filter((d: any) => matchDoc(d, stage.$match));
      }
      if (stage.$group) {
        const groups: { [key: string]: any } = {};
        for (const doc of docs) {
          const groupKey = stage.$group._id ? String(doc[stage.$group._id.replace(/^\$/, "")] || "") : "all";
          if (!groups[groupKey]) {
            groups[groupKey] = { _id: groupKey };
            for (const [k, agg] of Object.entries(stage.$group)) {
              if (k === "_id") continue;
              if (typeof agg === "object" && (agg as any).$sum) {
                groups[groupKey][k] = 0;
              }
            }
          }
          for (const [k, agg] of Object.entries(stage.$group)) {
            if (k === "_id") continue;
            if (typeof agg === "object" && (agg as any).$sum) {
              const sumField = (agg as any).$sum;
              const val = typeof sumField === "number" ? sumField : Number(doc[sumField.replace(/^\$/, "")]) || 0;
              groups[groupKey][k] += val;
            }
          }
        }
        docs = Object.values(groups);
      }
      if (stage.$sort) {
        const entries = Object.entries(stage.$sort);
        docs.sort((a: any, b: any) => {
          for (const [key, dir] of entries) {
            const mult = dir === -1 ? -1 : 1;
            const aVal = a[key];
            const bVal = b[key];
            if (aVal !== bVal) {
              return (Number(aVal) - Number(bVal)) * mult;
            }
          }
          return 0;
        });
      }
    }
    return docs;
  }
}

export function createNeonModel<T = any>(tableName: string): NeonModel<T> {
  return new NeonModel<T>(tableName);
}
