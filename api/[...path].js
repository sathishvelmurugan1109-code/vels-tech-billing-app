import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { app, connectDB } = require("../server/server.js");

let databaseConnection;

export default async function handler(req, res) {
  try {
    if (!databaseConnection) {
      databaseConnection = connectDB().catch((error) => {
        databaseConnection = undefined;
        throw error;
      });
    }
    await databaseConnection;
    return app(req, res);
  } catch (error) {
    console.error("[API] Database connection unavailable:", error.message);
    return res.status(503).json({
      message: "Authentication service is temporarily unavailable.",
    });
  }
}
