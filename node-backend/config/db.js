/**
 * config/db.js
 * -------------
 * MongoDB connection. Kept as a function that returns a promise so
 * server.js can decide what to do if it fails (in dev, we log a clear
 * warning and keep the server running anyway, so you can still test
 * routes that DON'T need the database, like the AI-forwarding smoke test).
 */

const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("<username>")) {
    console.warn(
      "\n⚠️  MONGODB_URI is not set (or still has the placeholder values).\n" +
      "   Auth and history routes will NOT work until you set a real\n" +
      "   MongoDB Atlas connection string in your .env file.\n"
    );
    return null;
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
    return mongoose.connection;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    return null;
  }
}

module.exports = connectDB;
