const EmailAnalysis = require("../models/EmailAnalysis");
const { serializeAnalysis } = require("../utils/serializeAnalysis");

async function listHistory(req, res) {
  try {
    const records = await EmailAnalysis.find({ investigator: req.investigator.id })
      .sort({ createdAt: -1 })
      .select("-rawEmailSnippet");
    res.json(records.map(serializeAnalysis));
  } catch (err) {
    res.status(500).json({ error: "Could not load history.", detail: err.message });
  }
}

async function getOne(req, res) {
  try {
    const record = await EmailAnalysis.findOne({
      _id: req.params.id,
      investigator: req.investigator.id,
    });
    if (!record) return res.status(404).json({ error: "Analysis not found." });
    res.json(serializeAnalysis(record));
  } catch (err) {
    res.status(500).json({ error: "Could not load analysis.", detail: err.message });
  }
}

module.exports = { listHistory, getOne };