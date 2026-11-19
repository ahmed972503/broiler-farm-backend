const { spawn } = require("child_process");
const path = require("path");

console.log("\n========================================================");
console.log("  🚀 AL-BARAKAH BROILER FARM - 1-CLICK SYSTEM LAUNCHER");
console.log("========================================================\n");

// 1. Start MongoDB on Port 27017
console.log("[1/3] Starting Local MongoDB (Port 27017)...");
const mongoProcess = spawn("npm", ["run", "dev:mongo"], {
  stdio: "inherit",
  shell: true,
});

// 2. Start Backend API on Port 5000 after 3 seconds
setTimeout(() => {
  console.log("\n[2/3] Starting Backend API (Port 5000)...");
  const apiProcess = spawn("npm", ["run", "dev:api"], {
    stdio: "inherit",
    shell: true,
  });

  // 3. Start Expo Web on Port 8081 after another 3 seconds
  setTimeout(() => {
    console.log("\n[3/3] Starting Expo Web App (Port 8081)...");
    const webProcess = spawn("npm", ["run", "dev:web"], {
      stdio: "inherit",
      shell: true,
    });

    const cleanup = () => {
      console.log("\n[Shutdown] Stopping all farm services...");
      try { mongoProcess.kill(); } catch (e) {}
      try { apiProcess.kill(); } catch (e) {}
      try { webProcess.kill(); } catch (e) {}
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }, 3500);
}, 3500);
