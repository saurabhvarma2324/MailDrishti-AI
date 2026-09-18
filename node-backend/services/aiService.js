/**
 * services/aiService.js
 * ------------------------
 * This file IS the "send for analysis" / "AI Module (Python)" arrow in
 * your architecture diagram. Node never re-implements detection logic —
 * it just forwards the email to the Python service (which already does
 * parsing, header forensics, IOC extraction, and explainable scoring)
 * and passes the result back.
 *
 * Why keep Python as a separate internal service instead of rewriting
 * the AI logic in JS: scikit-learn, Python's email parser, and dnspython
 * don't have equally mature JS equivalents. Splitting it out is the
 * standard real-world pattern, not a hack — it's exactly what your
 * diagram already shows.
 */

const axios = require("axios");
const FormData = require("form-data");

const AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || "http://localhost:8000";

/**
 * Forward an uploaded .eml file (as a Buffer, from multer) to the
 * Python service's /api/analyze endpoint.
 */
async function analyzeEmailFile(fileBuffer, originalFilename) {
  const form = new FormData();
  form.append("file", fileBuffer, { filename: originalFilename || "upload.eml" });

  const response = await axios.post(`${AI_SERVICE_URL}/api/analyze`, form, {
    headers: form.getHeaders(),
    timeout: 15000,
  });
  return response.data;
}

/**
 * Forward raw .eml TEXT (e.g. pasted into a textarea) to the Python
 * service's /api/analyze-text endpoint.
 */
async function analyzeEmailText(rawEmlText) {
  const response = await axios.post(
    `${AI_SERVICE_URL}/api/analyze-text`,
    { raw_eml: rawEmlText },
    { headers: { "Content-Type": "application/json" }, timeout: 15000 }
  );
  return response.data;
}
async function verifyLedger() {
  const response = await axios.get(`${AI_SERVICE_URL}/api/ledger/verify`, { timeout: 5000 });
  return response.data;
}

module.exports = { analyzeEmailFile, analyzeEmailText, verifyLedger };
