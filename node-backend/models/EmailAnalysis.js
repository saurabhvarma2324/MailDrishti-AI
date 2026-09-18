/**
 * models/EmailAnalysis.js
 * -------------------------
 * One document per analyzed email. This is what makes the "Investigation
 * Timeline" and history view possible — without saving each analysis,
 * every result would disappear the moment you close the tab.
 *
 * The shape mirrors exactly what the Python AI module returns (see
 * backend/app/pipeline.py -> analyze_raw_email), so saving it is a
 * near-direct copy, not a re-mapping exercise.
 */

const mongoose = require("mongoose");

const reasonSchema = new mongoose.Schema(
  {
    feature: String,
    value: Number,
    contribution: Number,
    reason: String,
  },
  { _id: false }
);

const emailAnalysisSchema = new mongoose.Schema(
  {
    investigator: { type: mongoose.Schema.Types.ObjectId, ref: "Investigator", required: true },
    case: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },

    subject: String,
    fromAddress: String,

    riskScore: Number,
    riskLabel: String,
    threatType: String,
    aiDisclaimer: String,
    topReasons: [reasonSchema],

    headerFindings: { type: mongoose.Schema.Types.Mixed },
    iocs: { type: mongoose.Schema.Types.Mixed },
    modelNote: String,

    // Populated once the blockchain evidence ledger module is wired in —
    // lets the frontend show "Evidence sealed at Block #4, hash 9f2a...".
    blockchainBlockIndex: Number,
    blockchainBlockHash: String,
    blockchainEvidenceHash: String,

    rawEmailSnippet: { type: String }, // first ~500 chars, for quick preview in history list
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailAnalysis", emailAnalysisSchema);
