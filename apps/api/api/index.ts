import { createApp } from "../src/app";
import { initNeonDatabase } from "../src/config/postgres";

const app = createApp();
let isInitialized = false;

export default async function handler(req: any, res: any) {
  if (!isInitialized) {
    try {
      await initNeonDatabase();
      isInitialized = true;
    } catch (err) {
      console.error("[Vercel Neon Init Error]:", err);
    }
  }
  return app(req, res);
}
