const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { createCase, listCases, getCase, updateCaseStatus, addNote, deleteCase } = require("../controllers/caseController");

router.post("/", requireAuth, createCase);
router.get("/", requireAuth, listCases);
router.get("/:id", requireAuth, getCase);
router.patch("/:id/status", requireAuth, updateCaseStatus);
router.post("/:id/notes", requireAuth, addNote);
router.delete("/:id", requireAuth, deleteCase);

module.exports = router;
