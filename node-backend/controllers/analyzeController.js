/**
 * controllers/analyzeController.js
 * -----------------------------------
 * This is the "API Service — Requests • orchestration" box in your
 * diagram. It does three things in order, exactly like the arrows show:
 *   1. send for analysis  -> calls the Python AI module
 *   2. store results      -> saves the finding in MongoDB
 *   3. returns the result -> back to the React frontend
 */

const { analyzeEmailFile, analyzeEmailText } = require("../services/aiService");
const EmailAnalysis = require("../models/EmailAnalysis");
const Case = require("../models/Case");

function buildRawSnippet(text) {
  if (!text) return "";
  return text.length > 500 ? text.slice(0, 500) + "…" : text;
}

async function saveAnalysis(investigatorId, caseId, aiResult, rawEmailText) {
  return EmailAnalysis.create({
    investigator: investigatorId,
    case: caseId,
    subject: aiResult.subject,
    fromAddress: aiResult.from_address,
    riskScore: aiResult.risk_score,
    riskLabel: aiResult.risk_label,
    threatType: aiResult.threat_type,
    aiDisclaimer: aiResult.ai_disclaimer,
    topReasons: (aiResult.top_reasons || []).map((r) => ({
      feature: r.feature,
      value: r.value,
      contribution: r.contribution,
      reason: r.reason,
    })),
    headerFindings: aiResult.header_findings,
    iocs: aiResult.iocs,
    modelNote: aiResult.model_note,

    blockchainBlockIndex: aiResult.blockchain?.block_index,
    blockchainBlockHash: aiResult.blockchain?.block_hash,
    blockchainEvidenceHash: aiResult.blockchain?.evidence_hash,

    rawEmailSnippet: buildRawSnippet(rawEmailText),
  });
}

async function analyzeUploadedFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Field name must be 'file'." });
    }
    const { caseId } = req.body;
    if (!caseId) {
      return res.status(400).json({ error: "caseId is required — every analyzed email must belong to a case." });
    }
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found for the given caseId." });
    }

    const aiResult = await analyzeEmailFile(req.file.buffer, req.file.originalname);
    const rawText = req.file.buffer.toString("utf-8");

    let saved = null;
    try {
      saved = await saveAnalysis(req.investigator.id, caseId, aiResult, rawText);
    } catch (dbErr) {
      // Don't fail the whole request just because history-saving failed —
      // the investigator still gets their analysis. Log it and flag it.
      console.error("Warning: analysis succeeded but saving to MongoDB failed:", dbErr.message);
    }

    res.json({ ...aiResult, _id: saved ? saved._id : null, _savedToHistory: !!saved });
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return res.status(502).json({
        error: "Could not reach the Python AI module. Is it running on the configured PYTHON_AI_SERVICE_URL?",
      });
    }
    res.status(500).json({ error: "Analysis failed.", detail: err.message });
  }
}

async function analyzeTextEmail(req, res) {
  try {
    const { raw_eml, caseId } = req.body;
    if (!raw_eml || !raw_eml.trim()) {
      return res.status(400).json({ error: "raw_eml is required and cannot be empty." });
    }
    if (!caseId) {
      return res.status(400).json({ error: "caseId is required — every analyzed email must belong to a case." });
    }
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found for the given caseId." });
    }

    const aiResult = await analyzeEmailText(raw_eml);

    let saved = null;
    try {
      saved = await saveAnalysis(req.investigator.id, caseId, aiResult, raw_eml);
    } catch (dbErr) {
      console.error("Warning: analysis succeeded but saving to MongoDB failed:", dbErr.message);
    }

    res.json({ ...aiResult, _id: saved ? saved._id : null, _savedToHistory: !!saved });
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return res.status(502).json({
        error: "Could not reach the Python AI module. Is it running on the configured PYTHON_AI_SERVICE_URL?",
      });
    }
    res.status(500).json({ error: "Analysis failed.", detail: err.message });
  }
}

module.exports = { analyzeUploadedFile, analyzeTextEmail };
