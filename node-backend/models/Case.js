/**
 * models/Case.js
 * ----------------
 * An investigation case. Every uploaded/analyzed email belongs to a case —
 * this is what lets an investigator group multiple related emails (e.g.
 * a whole phishing campaign) under one investigation, and matches the
 * Create Case -> Upload Email -> Analyze flow from the spec.
 */

const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Investigator" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const caseSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, unique: true }, // e.g. "CASE-2026-001"
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    status: {
      type: String,
      enum: ["Under Investigation", "Confirmed Threat", "False Positive", "Resolved"],
      default: "Under Investigation",
    },
    investigator: { type: mongoose.Schema.Types.ObjectId, ref: "Investigator", required: true },
    notes: [noteSchema],
  },
  { timestamps: true }
);

// Generates "CASE-2026-001" style IDs. Fine for hackathon-scale concurrency;
// a real production system would use a proper atomic counter instead.
caseSchema.statics.generateCaseId = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments();
  return `CASE-${year}-${String(count + 1).padStart(3, "0")}`;
};

module.exports = mongoose.model("Case", caseSchema);
