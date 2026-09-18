const express = require("express");
const multer = require("multer");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { analyzeUploadedFile, analyzeTextEmail } = require("../controllers/analyzeController");
const { verifyLedger } = require("../services/aiService");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/analyze", requireAuth, upload.single("file"), analyzeUploadedFile);
router.post("/analyze-text", requireAuth, analyzeTextEmail);

router.get("/ledger/verify", requireAuth, async (req, res) => {
  try {
    const result = await verifyLedger();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: "Could not reach the evidence ledger.", detail: err.message });
  }
});

module.exports = router;