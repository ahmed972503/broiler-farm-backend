import { MongoMemoryServer } from "mongodb-memory-server";

async function start() {
  console.log(
    "[Local MongoDB] Starting embedded MongoDB server on port 27017...",
  );
  try {
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: "broiler_farm",
        ip: "127.0.0.1",
      },
    });

    console.log("\n========================================================");
    console.log("  [SUCCESS] Local MongoDB is RUNNING!");
    console.log(`  URI: ${mongod.getUri()}`);
    console.log("  Port: 27017");
    console.log("  Database: broiler_farm");
    console.log("========================================================");
    console.log("Keep this terminal window open while using the app.\n");

    const cleanup = async () => {
      console.log("\n[Local MongoDB] Stopping MongoDB server...");
      await mongod.stop();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  } catch (err: any) {
    if (err.message && err.message.includes("EADDRINUSE")) {
      console.log(
        "\n[Notice] MongoDB is ALREADY running on port 27017! You are good to proceed.\n",
      );
    } else {
      console.error("[Local MongoDB Error]:", err);
    }
  }
}

start();
