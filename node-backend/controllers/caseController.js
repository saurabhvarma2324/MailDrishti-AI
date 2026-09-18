/**
 * controllers/caseController.js
 */

const Case = require("../models/Case");
const EmailAnalysis = require("../models/EmailAnalysis");
const { serializeAnalysis } = require("../utils/serializeAnalysis");

async function createCase(req, res) {
  try {
    const { title, description, priority } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "title is required." });
    }

    const caseId = await Case.generateCaseId();
    const newCase = await Case.create({
      caseId,
      title,
      description: description || "",
      priority: priority || "Medium",
      investigator: req.investigator.id,
    });

    const populated = await newCase.populate("investigator", "name email");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: "Could not create case.", detail: err.message });
  }
}

async function listCases(req, res) {
  try {
    // Cases are visible to the whole investigation team, not just their
    // creator — this is a shared SOC tool, not a personal history list.
    const cases = await Case.find()
      .sort({ createdAt: -1 })
      .populate("investigator", "name email");
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: "Could not load cases.", detail: err.message });
  }
}

async function getCase(req, res) {
  try {
    const found = await Case.findById(req.params.id).populate("investigator", "name email");
    if (!found) return res.status(404).json({ error: "Case not found." });

    const analyses = await EmailAnalysis.find({ case: found._id }).sort({ createdAt: -1 });

    const timeline = [
      {
        timestamp: found.createdAt,
        eventType: "Case Created",
        description: `Case ${found.caseId} created: "${found.title}"`,
      },
    ];
    for (const a of [...analyses].sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt))) {
      const base = new Date(a.createdAt).getTime();
      timeline.push({
        timestamp: new Date(base),
        eventType: "Email Uploaded & Parsed",
        description: `"${a.subject || "(no subject)"}" from ${a.fromAddress || "unknown sender"}`,
      });
      timeline.push({
        timestamp: new Date(base + 1000),
        eventType: "Threat Analysis Completed",
        description: `Risk score ${a.riskScore}/100 — ${a.riskLabel}`,
      });
      const iocCount = Object.values(a.iocs || {}).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      timeline.push({
        timestamp: new Date(base + 2000),
        eventType: "IOCs Extracted",
        description: `${iocCount} indicator(s) extracted`,
      });
      if (a.blockchainBlockHash) {
        timeline.push({
          timestamp: new Date(base + 3000),
          eventType: "Evidence Sealed",
          description: `Block #${a.blockchainBlockIndex}, hash ${a.blockchainBlockHash.slice(0, 12)}…`,
        });
      }
    }
    for (const note of found.notes || []) {
      timeline.push({
        timestamp: note.addedAt,
        eventType: "Investigator Note Added",
        description: note.text,
      });
    }
    timeline.sort((x, y) => new Date(x.timestamp) - new Date(y.timestamp));

    res.json({ ...found.toObject(), analyses: analyses.map(serializeAnalysis), timeline });
  } catch (err) {
    res.status(500).json({ error: "Could not load case.", detail: err.message });
  }
}

async function updateCaseStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ["Under Investigation", "Confirmed Threat", "False Positive", "Resolved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
    }

    const updated = await Case.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate(
      "investigator",
      "name email"
    );
    if (!updated) return res.status(404).json({ error: "Case not found." });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Could not update case.", detail: err.message });
  }
}

async function addNote(req, res) {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "note text is required." });
    }

    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { text, addedBy: req.investigator.id } } },
      { new: true }
    ).populate("investigator", "name email");
    if (!updated) return res.status(404).json({ error: "Case not found." });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Could not add note.", detail: err.message });
  }
}
async function deleteCase(req, res) {
  try {
    const found = await Case.findById(req.params.id);
    if (!found) return res.status(404).json({ error: "Case not found." });

    await EmailAnalysis.deleteMany({ case: found._id });
    await Case.deleteOne({ _id: found._id });

    res.json({ message: `Case ${found.caseId} deleted.`, deletedCaseId: found.caseId });
  } catch (err) {
    res.status(500).json({ error: "Could not delete case.", detail: err.message });
  }
}

module.exports = { createCase, listCases, getCase, updateCaseStatus, addNote, deleteCase };


