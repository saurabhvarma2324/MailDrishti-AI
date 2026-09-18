"""
risk_engine.py
---------------
Stage 4 (the flagship module): turn everything the earlier stages found
into ONE explainable risk score.

Design choice — WHY a linear (logistic-regression-style) model, not a
black-box one:
The score is just a weighted sum of features, run through a sigmoid.
That means "why did it score this email 82/100?" has a literal, honest
answer: "because these specific features were present, each
contributing this much." That's what the problem statement means by
"explainable" — not a vague confidence number, but a traceable reason
list.

IMPORTANT — be honest about this in your pitch, and read this if you
change anything here:
The feature weights below are DOMAIN-INFORMED, not learned from a real
labeled email corpus — e.g. a failed DMARC check is weighted higher
than one urgency phrase, because that reflects actual email-security
practice, not a training-data artifact. We started by training these
same weights on a small synthetic dataset (you may see traces of that
approach if you check the git history), but a tiny synthetic set gave
unstable, hard-to-defend coefficients — e.g. it once scored an email
with THREE failed auth checks plus a malware attachment as "Likely
Legitimate," because count-based features like repeated urgency
phrases happened to dominate the fit. Hand-set, domain-justified
weights are more reliable for a live demo AND more honest to defend:
"these weights encode known email-security signals; the next step
before production use is validating and refining them against a real
labeled dataset" is a completely normal, credible thing to say in a
jury round.
"""

from __future__ import annotations
import re
import math
from dataclasses import dataclass, field
import numpy as np

FEATURE_NAMES = [
    "urgency_score",
    "credential_harvest_score",
    "payment_request_score",
    "generic_greeting",
    "spf_fail",
    "dkim_fail",
    "dmarc_fail",
    "reply_to_mismatch",
    "return_path_mismatch",
    "display_name_impersonation",
    "suspicious_tld_count",
    "shortened_url_count",
    "risky_attachment_count",
    "url_count",
]

URGENCY_PHRASES = [
    "urgent", "immediately", "act now", "final notice", "account suspended",
    "verify your account", "within 24 hours", "failure to respond",
    "immediate action required", "will be locked", "last warning", "act fast",
]
CREDENTIAL_HARVEST_PHRASES = [
    "verify your password", "confirm your login", "update your account details",
    "click here to verify", "re-enter your credentials", "login to confirm",
    "validate your account", "confirm your identity",
]
PAYMENT_PHRASES = [
    "wire transfer", "bank details", "invoice attached", "payment is overdue",
    "update payment information", "gift card", "urgent payment", "account number",
    "swift code", "beneficiary account", "outstanding payment", "process the payment",
]
GENERIC_GREETINGS = ["dear customer", "dear user", "dear valued customer", "dear account holder", "dear sir/madam"]
SUSPICIOUS_TLDS = [".xyz", ".top", ".club", ".loan", ".zip", ".country", ".stream", ".gq", ".work", ".click", ".info"]

EXPLANATION_TEMPLATES = {
    "urgency_score": "Uses urgency/pressure language ({v} phrase(s) found) — a classic social-engineering tactic",
    "credential_harvest_score": "Asks the recipient to verify or re-enter login credentials ({v} phrase(s) found)",
    "payment_request_score": "References payments, invoices, or bank details ({v} phrase(s) found) — check for invoice/BEC fraud",
    "generic_greeting": "Uses a generic greeting instead of the recipient's name — common in mass phishing campaigns",
    "spf_fail": "SPF authentication FAILED — the sending server is not authorized to send for this domain",
    "dkim_fail": "DKIM signature FAILED or is missing — message integrity cannot be verified",
    "dmarc_fail": "DMARC policy check FAILED — the domain owner's authentication policy was not met",
    "reply_to_mismatch": "Reply-To address is on a different domain than the sender — replies would be redirected silently",
    "return_path_mismatch": "Return-Path domain differs from the visible sender's domain",
    "display_name_impersonation": "Display name suggests a trusted organization, but the sending domain doesn't match it",
    "suspicious_tld_count": "Links use a domain ending (TLD) commonly abused for throwaway phishing infrastructure",
    "shortened_url_count": "Uses shortened/redirect links that hide the true destination",
    "risky_attachment_count": "Contains an attachment type often used to deliver malware",
    "url_count": "Contains multiple external links",
}


def _count_phrases(text: str, phrases: list[str]) -> int:
    text_lower = text.lower()
    return sum(text_lower.count(p) for p in phrases)


def extract_features(parsed_email, header_findings, iocs) -> dict:
    combined_text = f"{parsed_email.subject}\n{parsed_email.body_text}\n{parsed_email.body_html}"
    text_lower = combined_text.lower()

    generic_greeting = 1 if any(g in text_lower for g in GENERIC_GREETINGS) else 0

    suspicious_tld_count = sum(
        1 for d in iocs.domains if any(d.endswith(tld) for tld in SUSPICIOUS_TLDS)
    )
    suspicious_tld_count += 1 if any(
        header_findings.from_domain.endswith(tld) for tld in SUSPICIOUS_TLDS
    ) else 0

    features = {
        "urgency_score": _count_phrases(combined_text, URGENCY_PHRASES),
        "credential_harvest_score": _count_phrases(combined_text, CREDENTIAL_HARVEST_PHRASES),
        "payment_request_score": _count_phrases(combined_text, PAYMENT_PHRASES),
        "generic_greeting": generic_greeting,
        "spf_fail": 1 if header_findings.spf_result and header_findings.spf_result != "pass" else 0,
        "dkim_fail": 1 if header_findings.dkim_result and header_findings.dkim_result != "pass" else 0,
        "dmarc_fail": 1 if header_findings.dmarc_result and header_findings.dmarc_result != "pass" else 0,
        "reply_to_mismatch": 1 if header_findings.reply_to_mismatch else 0,
        "return_path_mismatch": 1 if header_findings.return_path_mismatch else 0,
        "display_name_impersonation": 1 if header_findings.display_name_impersonation_flag else 0,
        "suspicious_tld_count": suspicious_tld_count,
        "shortened_url_count": len(iocs.shortened_or_suspicious_urls),
        "risky_attachment_count": len(iocs.risky_attachments),
        "url_count": len(iocs.urls),
    }
    return features


def _vectorize(features: dict) -> np.ndarray:
    return np.array([[features[name] for name in FEATURE_NAMES]], dtype=float)


# Domain-informed weight for each feature — how much ONE unit of that
# feature pushes the risk score up (see module docstring for why these
# are hand-set rather than learned from a tiny synthetic dataset).
# Ordered roughly strongest -> weakest signal.
FEATURE_WEIGHTS = {
    "risky_attachment_count": 3.2,          # an executable-style attachment is a very strong signal
    "dmarc_fail": 3.0,                       # the domain owner's OWN policy says this should be rejected
    "display_name_impersonation": 3.0,       # "looks official, isn't" is a strong, specific tell
    "dkim_fail": 2.7,
    "reply_to_mismatch": 2.5,                # classic BEC — replies get silently redirected
    "spf_fail": 2.3,
    "credential_harvest_score": 2.0,          # per phrase found
    "suspicious_tld_count": 1.6,
    "return_path_mismatch": 1.4,
    "payment_request_score": 1.3,             # per phrase found — weighted lower alone since invoices happen legitimately too
    "shortened_url_count": 1.2,
    "generic_greeting": 1.0,
    "urgency_score": 0.9,                     # per phrase found — common but easy to fake in bulk, so weighted modestly per-unit
    "url_count": 0.15,                        # weak signal on its own, mostly volume
}

# Baseline (intercept): a completely clean email (every feature = 0)
# should sit very close to 0/100. sigmoid(-4) ≈ 1.8%.
INTERCEPT = -4.0

def classify_threat_type(risk_score: float, top_reasons: list) -> str:
    if risk_score < 25:
        return "Safe / Legitimate"

    reason_features = {r["feature"] for r in top_reasons}

    if "risky_attachment_count" in reason_features:
        return "Malware Delivery"
    if "credential_harvest_score" in reason_features:
        return "Credential Phishing"
    if "payment_request_score" in reason_features and (
        "display_name_impersonation" in reason_features or "reply_to_mismatch" in reason_features
    ):
        return "Business Email Compromise (BEC)"
    if "shortened_url_count" in reason_features or "suspicious_tld_count" in reason_features:
        return "Phishing"
    if {"spf_fail", "dkim_fail", "dmarc_fail"} & reason_features:
        return "Authentication Anomaly"
    if risk_score >= 50:
        return "Suspicious Activity"
    return "Minor Anomaly"

class RiskEngine:
    """
    A linear, explainable scorer: risk = sigmoid(intercept + sum(weight_i * feature_i)).
    See module docstring for why the weights are domain-set rather than
    fit on a tiny synthetic dataset.
    """

    def __init__(self):
        self.weights = FEATURE_WEIGHTS
        self.intercept = INTERCEPT

    def score(self, features: dict) -> dict:
        linear_sum = self.intercept + sum(
            self.weights.get(name, 0.0) * features.get(name, 0) for name in FEATURE_NAMES
        )
        proba_phishing = 1.0 / (1.0 + math.exp(-linear_sum))
        risk_score = round(proba_phishing * 100, 1)

        contributions = []
        for name in FEATURE_NAMES:
            value = features[name]
            weight = self.weights.get(name, 0.0)
            contribution = weight * value
            if value > 0 and contribution > 0:
                contributions.append({
                    "feature": name,
                    "value": value,
                    "contribution": round(float(contribution), 3),
                    "reason": EXPLANATION_TEMPLATES[name].format(v=value),
                })
        contributions.sort(key=lambda c: c["contribution"], reverse=True)

        if risk_score >= 75:
            label = "High Risk — Likely Phishing / Fraud"
        elif risk_score >= 50:
            label = "Suspicious — Needs Investigator Review"
        elif risk_score >= 25:
            label = "Low Suspicion — Minor Anomalies Present"
        else:
            label = "Likely Legitimate"

        return {
            "risk_score": risk_score,
            "risk_label": label,
            "threat_type": classify_threat_type(risk_score, contributions[:6]),
            "ai_disclaimer": (
                "This is an AI-assisted assessment based on observable patterns. "
                "It does not constitute proof of a crime and requires investigator verification."
            ),
            "top_reasons": contributions[:6],
            "all_features": features,
            "model_note": (
                "Explainable linear risk model with domain-informed feature weights "
                "(see risk_engine.py docstring for why). Validate and refine weights "
                "against a real labeled dataset before production use."
            ),
        }
