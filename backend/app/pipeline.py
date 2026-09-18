"""
pipeline.py
-----------
The single entry point that wires every stage together:

    raw .eml text
        -> email_parser.parse_eml()
        -> header_forensics.analyze_headers()
        -> ioc_extractor.extract_iocs()
        -> risk_engine.RiskEngine.score()
        -> one combined result dict

Both the FastAPI endpoint and the CLI demo script call this same
function, so "what the API returns" and "what the demo prints" can
never drift apart.
"""

from __future__ import annotations
from .email_parser import parse_eml
from .header_forensics import analyze_headers
from .ioc_extractor import extract_iocs
from .risk_engine import RiskEngine, extract_features
from .blockchain_ledger import EvidenceLedger

# Loaded once at import time.
_ENGINE = RiskEngine()
_LEDGER = EvidenceLedger()  # persists to ./ledger_data/ — see blockchain_ledger.py


def analyze_raw_email(raw_text: str) -> dict:
    parsed = parse_eml(raw_text)
    header_findings = analyze_headers(parsed)
    iocs = extract_iocs(parsed, header_findings)
    features = extract_features(parsed, header_findings, iocs)
    risk = _ENGINE.score(features)

    result = {
        "subject": parsed.subject,
        "from_address": header_findings.from_address,
        "risk_score": risk["risk_score"],
        "risk_label": risk["risk_label"],
        "threat_type": risk["threat_type"],
        "ai_disclaimer": risk["ai_disclaimer"],
        "top_reasons": risk["top_reasons"],
        "header_findings": {
            "spf_result": header_findings.spf_result,
            "dkim_result": header_findings.dkim_result,
            "dmarc_result": header_findings.dmarc_result,
            "origin_ip_candidate": header_findings.origin_ip_candidate,
            "relay_hop_count": len(header_findings.relay_hops),
            "display_name": header_findings.display_name,
            "from_address": header_findings.from_address,
            "from_domain": header_findings.from_domain,
            "reply_to_mismatch": header_findings.reply_to_mismatch,
            "return_path_mismatch": header_findings.return_path_mismatch,
            "display_name_impersonation_flag": header_findings.display_name_impersonation_flag,
            "flags": header_findings.flags,
        },
        "iocs": {
            "urls": iocs.urls,
            "shortened_or_suspicious_urls": iocs.shortened_or_suspicious_urls,
            "domains": iocs.domains,
            "ip_addresses": iocs.ip_addresses,
            "email_addresses": iocs.email_addresses,
            "risky_attachments": iocs.risky_attachments,
        },
        "model_note": risk["model_note"],
        # Kept out of the API response by default (verbose), but useful for
        # the investigation timeline / relationship graph stages we build next.
        "_relay_hops_full": header_findings.relay_hops,
    }

    # Seal this analysis + the original raw email into the tamper-evident
    # evidence ledger (see blockchain_ledger.py). This is what makes the
    # finding auditable chain-of-custody, not just a JSON response nobody
    # can later prove wasn't altered.
    block = _LEDGER.add_evidence(raw_text, result)
    result["blockchain"] = {
        "block_index": block.index,
        "block_hash": block.block_hash,
        "evidence_hash": block.evidence_hash,
        "sealed_at": block.timestamp,
    }

    return result
