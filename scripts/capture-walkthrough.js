const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const OUTPUT_DIR = path.join(
  "C:",
  "Users",
  "mahme",
  ".gemini",
  "antigravity",
  "brain",
  "0436ba78-d7f6-41f5-b2fe-bcbe9976fe02",
  "walkthrough"
);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function waitForChrome(port = 9222, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const data = await getJson(`http://127.0.0.1:${port}/json/version`);
      return data;
    } catch {
      await delay(500);
    }
  }
  throw new Error("Timed out waiting for Chrome remote debugging port.");
}

async function run() {
  console.log("=== Starting Automated Visual Walkthrough Capture ===");
  console.log(`Output Directory: ${OUTPUT_DIR}`);

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const chromeProcess = spawn(
    chromePath,
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--user-data-dir=D:\\Poultary Farm\\.chrome_walkthrough_temp",
      "--no-first-run",
      "--disable-gpu",
      "--window-size=1280,850",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  console.log(`Spawned Chrome headless instance (PID: ${chromeProcess.pid})`);

  try {
    const version = await waitForChrome();
    console.log(`Chrome CDP ready at: ${version.webSocketDebuggerUrl}`);

    // Get existing page target from /json/list
    const pages = await getJson("http://127.0.0.1:9222/json/list");
    const page = pages.find((p) => p.type === "page") || pages[0];
    console.log(`Connected to page target: ${page.id}`);

    const wsUrl = page.webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    let msgId = 0;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const resp = JSON.parse(event.data);
      if (resp.id && callbacks.has(resp.id)) {
        const { resolve, reject } = callbacks.get(resp.id);
        callbacks.delete(resp.id);
        if (resp.error) reject(resp.error);
        else resolve(resp.result);
      }
    };

    await new Promise((resolve) => ws.onopen = resolve);

    function send(method, params = {}) {
      const id = ++msgId;
      return new Promise((resolve, reject) => {
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 850,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log("Navigating to http://localhost:8081...");
    await send("Page.navigate", { url: "http://localhost:8081" });
    console.log("Waiting for Expo Web bundle to finish loading...");
    await delay(7000);

    async function takeScreenshot(fileName, description) {
      console.log(`[Capturing]: ${fileName} - ${description}`);
      const res = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(OUTPUT_DIR, fileName);
      fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
      console.log(`  Saved: ${filePath} (${(res.data.length / 1024).toFixed(1)} KB)`);
    }

    // SCREEN 1: LOGIN SCREEN
    await takeScreenshot("01_login_screen.png", "Login Screen with Quick Demo buttons and Bilingual selector");

    // Click Admin demo button or login as admin
    console.log("Logging in as Admin (Haji Muhammad Ahmed)...");
    await send("Runtime.evaluate", {
      expression: `(function() {
        // Look for admin quick demo button or fill inputs
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const adminBtn = buttons.find(b => b.textContent && b.textContent.includes('Admin (Owner)'));
        if (adminBtn) {
          adminBtn.click();
        } else {
          const inputs = document.querySelectorAll('input');
          if (inputs[0]) inputs[0].value = 'admin';
          if (inputs[1]) inputs[1].value = 'admin123';
          const submitBtn = buttons.find(b => b.textContent && (b.textContent.includes('Login') || b.textContent.includes('Dakhil')));
          if (submitBtn) submitBtn.click();
        }
      })()`,
    });

    await delay(3500);

    // SCREEN 2: ADMIN DASHBOARD
    await takeScreenshot("02_admin_dashboard.png", "Admin Dashboard with 5 Sheds Overview, Active Flocks & Mortality KPIs");

    // SCREEN 3: SHEDS
    console.log("Navigating to Sheds Overview...");
    await send("Page.navigate", { url: "http://localhost:8081/(admin)/sheds" });
    await delay(2500);
    await takeScreenshot("03_sheds_overview.png", "5 Sheds Status: North, South, East, West, Central Wings");

    // SCREEN 4: BATCHES & FLOCKS
    console.log("Navigating to Batches & Weekly Flock Summary...");
    await send("Page.navigate", { url: "http://localhost:8081/(admin)/batches" });
    await delay(2500);
    await takeScreenshot("04_batches_flocks.png", "Batches & Weekly Flock Summary (TRUE FCR vs Farm method)");

    // SCREEN 5: DAILY REGISTER (16 COLUMNS)
    console.log("Navigating to 16-Column Daily Register...");
    await send("Page.navigate", { url: "http://localhost:8081/(admin)/daily-records" });
    await delay(2500);
    await takeScreenshot("05_daily_register_16_columns.png", "16-Column Daily Register mirroring Pakistan Paper Notebook");

    // SCREEN 6: FEED IN/OUT & PARTY LEDGER
    console.log("Navigating to Feed Stock & Party Ledger...");
    await send("Page.navigate", { url: "http://localhost:8081/(admin)/feed" });
    await delay(2500);
    await takeScreenshot("06_feed_stock_and_party_ledger.png", "Feed In/Out Ledger: Star/Chenab Feed & Party Ledger in Bags");

    // SCREEN 7: CATCHING / LIFTING NOTES
    console.log("Navigating to Catching & Lifting Notes...");
    await send("Page.navigate", { url: "http://localhost:8081/(admin)/sales" });
    await delay(2500);
    await takeScreenshot("07_sales_and_lifting_notes.png", "Catching/Lifting Notes: Partial Lots, Rates & Consistency Reconciliation");

    // SCREEN 8: REPORTS & EXPORTS
    console.log("Navigating to Reports & Historical Import...");
    await send("Page.navigate", { url: "http://localhost:8081/(admin)/reports" });
    await delay(2500);
    await takeScreenshot("08_reports_and_export.png", "Paper Register Export (PDF/CSV) & Historical CSV Import");

    // SCREEN 9: ALERTS CENTER
    console.log("Navigating to Alerts Center...");
    await send("Page.navigate", { url: "http://localhost:8081/(admin)/alerts" });
    await delay(2500);
    await takeScreenshot("09_alerts_center.png", "Alerts Center: Mortality Spike (>=1.0%), Feed Shortage & Missing Shift Alerts");

    // SCREEN 10: SETTINGS & CUSTOM COLUMN
    console.log("Navigating to Farm Settings & E.S Custom Column Config...");
    await send("Page.navigate", { url: "http://localhost:8081/(admin)/settings" });
    await delay(2500);
    await takeScreenshot("10_settings_and_custom_columns.png", "Farm Settings: Custom E.S Column Toggle, 50kg Bag Weight & Shed-level mode");

    // WORKER WORKFLOW: Switch to mobile viewport for Worker Screens
    console.log("Switching to Mobile Viewport (412 x 846) for Worker Experience...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 412,
      height: 846,
      deviceScaleFactor: 2,
      mobile: true,
    });

    console.log("Logging out Admin and Logging in as Worker 1 (Bashir Ahmed - Shed 1)...");
    await send("Page.navigate", { url: "http://localhost:8081/(auth)/login" });
    await delay(2500);

    await send("Runtime.evaluate", {
      expression: `(function() {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const workerBtn = buttons.find(b => b.textContent && b.textContent.includes('Worker 1'));
        if (workerBtn) {
          workerBtn.click();
        } else {
          const inputs = document.querySelectorAll('input');
          if (inputs[0]) inputs[0].value = 'worker1';
          if (inputs[1]) inputs[1].value = 'worker123';
          const submitBtn = buttons.find(b => b.textContent && (b.textContent.includes('Login') || b.textContent.includes('Dakhil')));
          if (submitBtn) submitBtn.click();
        }
      })()`,
    });

    await delay(3500);

    // SCREEN 11: WORKER TODAY
    await takeScreenshot("11_worker_today_tasks.png", "Worker Today: Shed 1 North Wing, Tasks & Offline Sync Banner");

    // SCREEN 12: WORKER DAILY ENTRY
    console.log("Navigating to Worker Daily Entry...");
    await send("Page.navigate", { url: "http://localhost:8081/(worker)/daily-entry" });
    await delay(2500);
    await takeScreenshot("12_worker_daily_entry_16_cols.png", "Worker Daily Entry: Day/Night Shift Feed & Mortality inputs (<60s entry)");

    // SCREEN 13: WORKER VACCINATIONS & MEDICINES
    console.log("Navigating to Worker Vaccinations & Medicines...");
    await send("Page.navigate", { url: "http://localhost:8081/(worker)/vaccinations" });
    await delay(2500);
    await takeScreenshot("13_worker_vaccinations_and_medicines.png", "Worker Medicine Sheet: Scheduled Vaccines & Water Medication with Ditto Copy");

    // SCREEN 14: WORKER WEIGHT
    console.log("Navigating to Worker Weight Sampling...");
    await send("Page.navigate", { url: "http://localhost:8081/(worker)/weight" });
    await delay(2500);
    await takeScreenshot("14_worker_weight_sampling.png", "Worker Weight Sampling: Weekly Sample Weighing vs Cobb 500 Curve");

    // SCREEN 15: WORKER HISTORY
    console.log("Navigating to Worker Khata History...");
    await send("Page.navigate", { url: "http://localhost:8081/(worker)/history" });
    await delay(2500);
    await takeScreenshot("15_worker_history_khata.png", "Worker Khata History: Locally Cached Records & Server Sync Status");

    console.log("\n=== Automated Visual Walkthrough Capture COMPLETE! ===");
    console.log(`15 High-Resolution Screenshots Captured into: ${OUTPUT_DIR}`);

    ws.close();
  } catch (err) {
    console.error("Walkthrough capture error:", err);
  } finally {
    try {
      chromeProcess.kill();
      console.log("Closed headless Chrome instance.");
    } catch {}
  }
}

run();
