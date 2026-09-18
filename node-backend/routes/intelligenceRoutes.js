const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { listIOCs, listGeoIntelligence } = require("../controllers/intelligenceController");

router.get("/iocs", requireAuth, listIOCs);
router.get("/geo", requireAuth, listGeoIntelligence);

module.exports = router;