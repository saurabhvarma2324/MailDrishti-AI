function serializeAnalysis(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    _id: d._id,
    subject: d.subject,
    from_address: d.fromAddress,
    risk_score: d.riskScore,
    risk_label: d.riskLabel,
    threat_type: d.threatType,
    ai_disclaimer: d.aiDisclaimer,
    top_reasons: d.topReasons,
    header_findings: d.headerFindings,
    iocs: d.iocs,
    model_note: d.modelNote,
    blockchain: {
      block_index: d.blockchainBlockIndex,
      block_hash: d.blockchainBlockHash,
      evidence_hash: d.blockchainEvidenceHash,
    },
    createdAt: d.createdAt,
  };
}

module.exports = { serializeAnalysis };