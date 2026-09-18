require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const analyzeRoutes = require("./routes/analyzeRoutes");
const historyRoutes = require("./routes/historyRoutes");
const caseRoutes = require("./routes/caseRoutes");
const intelligenceRoutes = require("./routes/intelligenceRoutes");
const graphRoutes = require("./routes/graphRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    service: "MailDrishti AI — Node/Express API Gateway",
    status: "ok",
    endpoints: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/cases (protected)",
      "GET  /api/cases (protected)",
      "GET  /api/cases/:id (protected)",
      "PATCH /api/cases/:id/status (protected)",
      "POST /api/cases/:id/notes (protected)",
      "POST /api/analyze (protected, file upload, needs caseId)",
      "POST /api/analyze-text (protected, JSON, needs caseId)",
      "GET  /api/iocs (protected, optional ?caseId=)",
      "GET  /api/geo (protected, optional ?caseId=)",
      "GET  /api/graph (protected, optional ?caseId=)",
      "GET  /api/dashboard/stats (protected)",
      "GET  /api/history (protected)",
      "GET  /api/history/:id (protected)",
    ],
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api", intelligenceRoutes);
app.use("/api", graphRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", analyzeRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 MailDrishti Node API running on http://localhost:${PORT}`);
    console.log(`   Forwarding AI requests to ${process.env.PYTHON_AI_SERVICE_URL || "http://localhost:8000"}`);
  });
}

start();