const EmailAnalysis = require("../models/EmailAnalysis");

async function getGraph(req, res) {
  try {
    const filter = req.query.caseId ? { case: req.query.caseId } : {};
    const analyses = await EmailAnalysis.find(filter).populate("case", "caseId title");

    const nodes = new Map();
    const edges = [];
    const edgeSet = new Set();

    const addNode = (id, label, type) => {
      if (!nodes.has(id)) nodes.set(id, { id, label, type });
    };
    const addEdge = (source, target, label) => {
      const key = `${source}->${target}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ id: key, source, target, label });
      }
    };

    for (const a of analyses) {
      const caseNodeId = a.case ? `case:${a.case._id}` : null;
      if (caseNodeId) addNode(caseNodeId, a.case.caseId, "case");

      const emailNodeId = `email:${a._id}`;
      addNode(emailNodeId, a.subject || "(no subject)", "email");
      if (caseNodeId) addEdge(caseNodeId, emailNodeId, "contains");

      if (a.fromAddress) {
        const senderId = `sender:${a.fromAddress}`;
        addNode(senderId, a.fromAddress, "sender");
        addEdge(emailNodeId, senderId, "from");
      }

      const iocs = a.iocs || {};
      (iocs.urls || []).forEach((u) => {
        const id = `url:${u}`;
        addNode(id, u, "url");
        addEdge(emailNodeId, id, "contains");
      });
      (iocs.domains || []).forEach((d) => {
        const id = `domain:${d}`;
        addNode(id, d, "domain");
        addEdge(emailNodeId, id, "references");
      });
      (iocs.ip_addresses || []).forEach((ip) => {
        const id = `ip:${ip}`;
        addNode(id, ip, "ip");
        addEdge(emailNodeId, id, "originates_from");
      });
      (iocs.risky_attachments || []).forEach((f) => {
        const id = `attachment:${a._id}:${f}`;
        addNode(id, f, "attachment");
        addEdge(emailNodeId, id, "attached");
      });
    }

    res.json({ nodes: [...nodes.values()], edges });
  } catch (err) {
    res.status(500).json({ error: "Could not build relationship graph.", detail: err.message });
  }
}

module.exports = { getGraph };