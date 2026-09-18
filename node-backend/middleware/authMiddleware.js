/**
 * middleware/authMiddleware.js
 * ------------------------------
 * Protects routes by requiring a valid JWT in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * On success, attaches the investigator's id + role to req.investigator
 * so downstream route handlers know WHO is making the request (used to
 * tag every EmailAnalysis with who ran it — important for an
 * investigator-accountability tool).
 */

const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header (Bearer token required)." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.investigator = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = { requireAuth };
