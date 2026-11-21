import express from "express";
import app from "./apps/api/src/app";

// Explicit express reference for Vercel static scanner
export { express };
export default app;
