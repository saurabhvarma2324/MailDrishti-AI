const EmailAnalysis = require("../models/EmailAnalysis");
const { getIPIntelligence } = require("../services/geoService");

function riskFromScore(score) {
  if (score >= 76) return { level: "Critical", status: "Suspicious" };
  if (score >= 51) return { level: "High", status: "Suspicious" };
  if (score >= 26) return { level: "Medium", status: "Under Review" };
  return { level: "Low", status: "Likely Benign" };
}

async function listIOCs(req, res) {
  try {
    const filter = req.query.caseId ? { case: req.query.caseId } : {};
    const analyses = await EmailAnalysis.find(filter).populate("case", "caseId title");

    const rows = [];
    for (const a of analyses) {
      const { level, status } = riskFromScore(a.riskScore || 0);
      const iocs = a.iocs || {};
      const sourceLabel = a.case ? `${a.case.caseId} — ${a.subject || "(no subject)"}` : a.subject;

      (iocs.ip_addresses || []).forEach((v) =>
        rows.push({ type: "IP", value: v, source: sourceLabel, caseId: a.case?._id, risk: level, status })
      );
      (iocs.domains || []).forEach((v) =>
        rows.push({ type: "Domain", value: v, source: sourceLabel, caseId: a.case?._id, risk: level, status })
      );
      (iocs.urls || []).forEach((v) => {
        const isShortened = (iocs.shortened_or_suspicious_urls || []).includes(v);
        rows.push({
          type: "URL",
          value: v,
          source: sourceLabel,
          caseId: a.case?._id,
          risk: isShortened ? "High" : level,
          status: isShortened ? "Suspicious" : status,
        });
      });
      (iocs.email_addresses || []).forEach((v) =>
        rows.push({ type: "Email", value: v, source: sourceLabel, caseId: a.case?._id, risk: level, status })
      );
      (iocs.risky_attachments || []).forEach((v) =>
        rows.push({ type: "Attachment", value: v, source: sourceLabel, caseId: a.case?._id, risk: "High", status: "Suspicious" })
      );
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Could not load IOCs.", detail: err.message });
  }
}

async function listGeoIntelligence(req, res) {
  try {
    const filter = req.query.caseId ? { case: req.query.caseId } : {};
    const analyses = await EmailAnalysis.find(filter).populate("case", "caseId title");

    const ipMap = new Map();
    for (const a of analyses) {
      const ips = new Set([
        ...(a.iocs?.ip_addresses || []),
        ...(a.headerFindings?.origin_ip_candidate ? [a.headerFindings.origin_ip_candidate] : []),
      ]);
      const { level } = riskFromScore(a.riskScore || 0);
      for (const ip of ips) {
        if (!ipMap.has(ip)) ipMap.set(ip, { relatedCases: new Set(), relatedEmails: new Set(), maxRisk: "Low" });
        const entry = ipMap.get(ip);
        if (a.case) entry.relatedCases.add(a.case.caseId);
        entry.relatedEmails.add(a.subject || "(no subject)");
        const order = { Low: 0, Medium: 1, High: 2, Critical: 3 };
        if (order[level] > order[entry.maxRisk]) entry.maxRisk = level;
      }
    }

    const uniqueIPs = [...ipMap.keys()];
    const enriched = await Promise.all(uniqueIPs.map((ip) => getIPIntelligence(ip)));

    const result = enriched.map((geo) => {
      const meta = ipMap.get(geo.ip);
      return {
        ...geo,
        risk: meta.maxRisk,
        relatedCases: [...meta.relatedCases],
        relatedEmails: [...meta.relatedEmails],
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Could not load geo intelligence.", detail: err.message });
  }
}

module.exports = { listIOCs, listGeoIntelligence };