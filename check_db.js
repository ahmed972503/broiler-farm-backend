const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_B9c8DCUSoHib@ep-aged-flower-bdou1t6x-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  try {
    const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:', r.rows.map(x => x.table_name));

    const s = await pool.query("SELECT * FROM sheds");
    console.log('Sheds count:', s.rows.length);
    console.log('Sheds:', s.rows);

    const u = await pool.query("SELECT id, username, role, assigned_shed_id FROM users");
    console.log('Users count:', u.rows.length);
    console.log('Users:', u.rows);
  } catch (e) {
    console.error('DB Error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
