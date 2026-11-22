const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_B9c8DCUSoHib@ep-aged-flower-bdou1t6x-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function createAllTables() {
  const client = await pool.connect();
  try {
    console.log("Starting Neon PostgreSQL complete schema initialization...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id VARCHAR(64) PRIMARY KEY,
        batch_number VARCHAR(64) UNIQUE,
        shed_id VARCHAR(64),
        status VARCHAR(32) DEFAULT 'active',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_batches_shed_id ON batches (shed_id);
      CREATE INDEX IF NOT EXISTS idx_batches_status ON batches (status);

      CREATE TABLE IF NOT EXISTS daily_records (
        id VARCHAR(64) PRIMARY KEY,
        batch_id VARCHAR(64),
        shed_id VARCHAR(64),
        date VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_daily_records_batch_date ON daily_records (batch_id, date);

      CREATE TABLE IF NOT EXISTS weight_records (
        id VARCHAR(64) PRIMARY KEY,
        batch_id VARCHAR(64),
        shed_id VARCHAR(64),
        date VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vaccination_templates (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vaccination_tasks (
        id VARCHAR(64) PRIMARY KEY,
        batch_id VARCHAR(64),
        shed_id VARCHAR(64),
        due_date VARCHAR(32),
        status VARCHAR(32) DEFAULT 'pending',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS medicine_records (
        id VARCHAR(64) PRIMARY KEY,
        batch_id VARCHAR(64),
        shed_id VARCHAR(64),
        date VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS daily_medicine_sheets (
        id VARCHAR(64) PRIMARY KEY,
        batch_id VARCHAR(64),
        shed_id VARCHAR(64),
        date VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feed_purchases (
        id VARCHAR(64) PRIMARY KEY,
        supplier VARCHAR(128),
        date VARCHAR(32),
        feed_type VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feed_issues (
        id VARCHAR(64) PRIMARY KEY,
        shed_id VARCHAR(64),
        batch_id VARCHAR(64),
        date VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feed_stock (
        id VARCHAR(64) PRIMARY KEY,
        feed_type VARCHAR(32) UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feed_transfers (
        id VARCHAR(64) PRIMARY KEY,
        party_name VARCHAR(128),
        date VARCHAR(32),
        type VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        id VARCHAR(64) PRIMARY KEY,
        category VARCHAR(64),
        name VARCHAR(128),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(64) PRIMARY KEY,
        batch_id VARCHAR(64),
        category VARCHAR(64),
        date VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(64) PRIMARY KEY,
        batch_id VARCHAR(64),
        shed_id VARCHAR(64),
        buyer_name VARCHAR(128),
        date VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS buyer_payments (
        id VARCHAR(64) PRIMARY KEY,
        buyer_name VARCHAR(128),
        sale_id VARCHAR(64),
        date VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128),
        phone VARCHAR(32),
        role VARCHAR(32),
        assigned_shed_id VARCHAR(64),
        status VARCHAR(32) DEFAULT 'active',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(64) PRIMARY KEY,
        staff_id VARCHAR(64),
        date VARCHAR(32),
        status VARCHAR(32),
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_advances (
        id VARCHAR(64) PRIMARY KEY,
        staff_id VARCHAR(64),
        date VARCHAR(32),
        status VARCHAR(32) DEFAULT 'pending',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(64),
        severity VARCHAR(32),
        shed_id VARCHAR(64),
        batch_id VARCHAR(64),
        is_resolved BOOLEAN DEFAULT false,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        entity_type VARCHAR(64),
        entity_id VARCHAR(64),
        action VARCHAR(32),
        performed_by VARCHAR(64),
        data JSONB NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS farm_settings (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure default farm_settings row exists
    const settingsCheck = await client.query("SELECT id FROM farm_settings WHERE id = 'default_settings'");
    if (settingsCheck.rows.length === 0) {
      const defaultSettings = {
        farmName: "Al-Barakah Broiler Farm",
        location: "Okara, Punjab, Pakistan",
        ownerName: "Haji Muhammad Ahmed",
        phone: "03001234567",
        totalSheds: 5,
        defaultFeedBagWeightKg: 50.0,
        currency: "PKR",
        defaultLanguage: "ur",
        customDailyColumn: { enabled: true, label: "E.S" },
        batchScope: "per_shed",
        alertThresholds: {
          mortalitySpikePercentDaily: 1.0,
          mortalitySpikePercent3Day: 2.0,
          weeklyMortalityAlertPercent: 3.0,
          stockShortageAlert: true,
          missedShiftEntryAlert: true,
          lowFeedStockBags: 20,
          tempMinCelsius: 20.0,
          tempMaxCelsius: 34.0,
          medicineExpiryWarningDays: 30,
          paymentOverdueDays: 14
        }
      };
      await client.query("INSERT INTO farm_settings (id, data) VALUES ('default_settings', $1)", [JSON.stringify(defaultSettings)]);
      console.log("Default farm_settings seeded into Neon PostgreSQL.");
    }

    // Ensure default feed_stock exists
    const feedStockCheck = await client.query("SELECT COUNT(*) FROM feed_stock");
    if (parseInt(feedStockCheck.rows[0].count, 10) === 0) {
      for (const ft of ["starter", "grower", "finisher"]) {
        const stockData = {
          feedType: ft,
          currentBags: 0,
          currentKg: 0,
          reorderThresholdBags: 20,
          bagWeightKg: 50,
          lastUpdated: new Date()
        };
        await client.query(
          "INSERT INTO feed_stock (id, feed_type, data) VALUES ($1, $2, $3)",
          [`stock_${ft}`, ft, JSON.stringify(stockData)]
        );
      }
      console.log("Default feed_stock seeded into Neon PostgreSQL.");
    }

    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("SUCCESS! Neon PostgreSQL all tables:", tablesRes.rows.map(x => x.table_name));
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

createAllTables();
