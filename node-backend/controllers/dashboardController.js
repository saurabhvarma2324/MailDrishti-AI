const Case = require("../models/Case");
const EmailAnalysis = require("../models/EmailAnalysis");

function riskBand(score) {
  if (score >= 76) return "Critical";
  if (score >= 51) return "High";
  if (score >= 26) return "Medium";
  return "Low";
}

async function getDashboardStats(req, res) {
  try {
    const [totalCases, analyses, activeInvestigations] = await Promise.all([
      Case.countDocuments(),
      EmailAnalysis.find(),
      Case.countDocuments({ status: "Under Investigation" }),
    ]);

    let totalIOCs = 0;
    let criticalThreats = 0;
    let highRiskThreats = 0;
    const suspiciousDomains = new Set();
    const suspiciousIPs = new Set();
    const threatDistribution = {};
    const riskDistribution = { Low: 0, Medium: 0, High: 0, Critical: 0 };

    for (const a of analyses) {
      const score = a.riskScore || 0;
      const iocs = a.iocs || {};

      totalIOCs += Object.values(iocs).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

      const band = riskBand(score);
      riskDistribution[band]++;
      if (band === "Critical") criticalThreats++;
      if (band === "Critical" || band === "High") {
        highRiskThreats++;
        (iocs.domains || []).forEach((d) => suspiciousDomains.add(d));
        (iocs.ip_addresses || []).forEach((ip) => suspiciousIPs.add(ip));
      }

      const label = a.threatType || a.riskLabel || "Unclassified";
      threatDistribution[label] = (threatDistribution[label] || 0) + 1;
    }

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const threatsOverTime = days.map((dayStr) => ({
      date: dayStr,
      count: analyses.filter((a) => new Date(a.createdAt).toISOString().slice(0, 10) === dayStr).length,
    }));

    const recentCases = await Case.find().sort({ createdAt: -1 }).limit(5).populate("investigator", "name");
    const recentInvestigations = await Promise.all(
      recentCases.map(async (c) => {
        const latest = await EmailAnalysis.findOne({ case: c._id }).sort({ createdAt: -1 });
        return {
          caseId: c.caseId,
          subject: latest ? latest.subject : c.title,
          risk_score: latest ? latest.riskScore : null,
          threat_type: latest ? latest.threatType : null,
          date: c.createdAt,
          status: c.status,
          investigator: c.investigator ? c.investigator.name : "Unknown",
        };
      })
    );

    res.json({
      totalCases,
      emailsAnalyzed: analyses.length,
      highRiskThreats,
      iocsExtracted: totalIOCs,
      criticalThreats,
      suspiciousDomains: suspiciousDomains.size,
      suspiciousIPs: suspiciousIPs.size,
      activeInvestigations,
      threatDistribution,
      threatsOverTime,
      riskDistribution,
      recentInvestigations,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not load dashboard stats.", detail: err.message });
  }
}

module.exports = { getDashboardStats };