const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { listHistory, getOne } = require("../controllers/historyController");

router.get("/", requireAuth, listHistory);
router.get("/:id", requireAuth, getOne);

module.exports = router;
