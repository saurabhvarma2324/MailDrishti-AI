/**
 * test/smokeTest.js
 * -------------------
 * A quick, no-framework sanity check for the two riskiest NEW pieces of
 * code in this layer — JWT signing/verification, and the call to the
 * Python AI module — without needing a real MongoDB connection. Run this
 * any time after changing server.js/aiService.js to catch obvious breaks
 * before you even open Postman.
 *
 * Usage:
 *   1. Make sure the Python service is running (uvicorn main:app --port 8000)
 *   2. node test/smokeTest.js
 */

require("dotenv").config();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { analyzeEmailText } = require("../services/aiService");

async function testJWT() {
  const secret = process.env.JWT_SECRET || "test_secret_for_smoketest_only";
  const token = jwt.sign({ id: "abc123", email: "test@example.com", role: "investigator" }, secret, {
    expiresIn: "1h",
  });
  const decoded = jwt.verify(token, secret);
  if (decoded.email !== "test@example.com") throw new Error("JWT roundtrip failed");
  console.log("✅ JWT sign/verify: OK");
}

async function testAIForwarding() {
  const samplePath = path.join(
    __dirname,
    "..",
    "..",
    "backend",
    "sample_emails",
    "sample_bec_fraud.eml"
  );
  if (!fs.existsSync(samplePath)) {
    console.log("⚠️  Skipping AI-forwarding test — sample .eml not found at", samplePath);
    return;
  }
  const rawEml = fs.readFileSync(samplePath, "utf-8");
  const result = await analyzeEmailText(rawEml);

  if (typeof result.risk_score !== "number") {
    throw new Error("Python AI module did not return a risk_score — check it's running on the right port.");
  }
  console.log(`✅ AI-forwarding to Python service: OK (risk_score=${result.risk_score}, label="${result.risk_label}")`);
}

(async () => {
  console.log("Running MailDrishti Node-layer smoke tests...\n");
  try {
    await testJWT();
    await testAIForwarding();
    console.log("\nAll smoke tests passed. (Note: this does NOT test MongoDB — set MONGODB_URI and test auth/history separately.)");
  } catch (err) {
    console.error("\n❌ Smoke test failed:", err.message);
    process.exit(1);
  }
})();
