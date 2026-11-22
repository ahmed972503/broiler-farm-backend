const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_B9c8DCUSoHib@ep-aged-flower-bdou1t6x-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function test() {
  const p = pool;

  // Test insert
  const id = `batch_${Date.now()}`;
  const batchData = {
    batchNumber: `FLOCK-${Date.now().toString().slice(-4)}`,
    shedId: "shed_001",
    chicksPlaced: 5000,
    placementDate: "2026-11-22",
    expectedCloseDate: "2026-12-27",
    supplier: "Hubbard Chicks Ltd",
    breed: "Cobb 500",
    chickRate: 95.0,
    initialCost: 475000,
    status: "active"
  };

  await p.query(
    "INSERT INTO batches (id, batch_number, shed_id, status, data) VALUES ($1, $2, $3, $4, $5)",
    [id, batchData.batchNumber, batchData.shedId, batchData.status, JSON.stringify(batchData)]
  );
  console.log("Created batch in Neon:", id);

  // Test find
  const res = await p.query("SELECT id, data FROM batches WHERE id = $1", [id]);
  const doc = { ...res.rows[0].data, id: res.rows[0].id, _id: res.rows[0].id };
  console.log("Fetched batch:", doc);

  // Test update / save
  doc.chicksPlaced = 5200;
  await p.query("UPDATE batches SET data = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(doc), id]);
  console.log("Updated batch in Neon!");

  // Clean up test batch
  await p.query("DELETE FROM batches WHERE id = $1", [id]);
  console.log("Deleted test batch. All Neon SQL operations work 100%!");
  await pool.end();
}

test().catch(console.error);
