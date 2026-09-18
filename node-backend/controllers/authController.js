/**
 * controllers/authController.js
 */

const jwt = require("jsonwebtoken");
const Investigator = require("../models/Investigator");

function signToken(investigator) {
  return jwt.sign(
    { id: investigator._id, email: investigator.email, role: investigator.role },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are all required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existing = await Investigator.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await Investigator.hashPassword(password);
    const investigator = await Investigator.create({ name, email, passwordHash });

    const token = signToken(investigator);
    res.status(201).json({
      token,
      investigator: { id: investigator._id, name: investigator.name, email: investigator.email, role: investigator.role },
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed.", detail: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required." });
    }

    const investigator = await Investigator.findOne({ email: email.toLowerCase() });
    if (!investigator) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await investigator.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(investigator);
    res.json({
      token,
      investigator: { id: investigator._id, name: investigator.name, email: investigator.email, role: investigator.role },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed.", detail: err.message });
  }
}

module.exports = { register, login };
