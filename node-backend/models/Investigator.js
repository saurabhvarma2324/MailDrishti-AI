/**
 * models/Investigator.js
 * ------------------------
 * A logged-in user of the tool. Passwords are hashed with bcrypt before
 * saving — the plain password is NEVER stored, only its hash. This is
 * standard practice, and worth being able to say in a jury round: "we
 * never store raw passwords, only a one-way bcrypt hash."
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const investigatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["investigator", "admin"], default: "investigator" },
  },
  { timestamps: true }
);

// Instance method: check a plain-text password against the stored hash.
investigatorSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Static helper: hash a plain password (used at registration time).
investigatorSchema.statics.hashPassword = function (plainPassword) {
  return bcrypt.hash(plainPassword, 10);
};

module.exports = mongoose.model("Investigator", investigatorSchema);
