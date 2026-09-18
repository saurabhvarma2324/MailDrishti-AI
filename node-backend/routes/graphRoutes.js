const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { getGraph } = require("../controllers/graphController");

router.get("/graph", requireAuth, getGraph);

module.exports = router;