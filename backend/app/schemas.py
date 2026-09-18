"""
schemas.py
----------
Response shape for the /api/analyze endpoint. Kept as one flat,
well-documented structure so the frontend team can build the dashboard
against a stable contract while the analysis internals keep evolving.
"""

from __future__ import annotations
from pydantic import BaseModel


class ReasonItem(BaseModel):
    feature: str
    value: float
    contribution: float
    reason: str


class HeaderFindingsOut(BaseModel):
    spf_result: str | None
    dkim_result: str | None
    dmarc_result: str | None
    origin_ip_candidate: str | None
    relay_hop_count: int
    display_name: str
    from_address: str
    from_domain: str
    reply_to_mismatch: bool
    return_path_mismatch: bool
    display_name_impersonation_flag: bool
    flags: list[str]


class IOCsOut(BaseModel):
    urls: list[str]
    shortened_or_suspicious_urls: list[str]
    domains: list[str]
    ip_addresses: list[str]
    email_addresses: list[str]
    risky_attachments: list[str]


class AnalyzeResponse(BaseModel):
    subject: str
    from_address: str
    risk_score: float
    risk_label: str
    ai_disclaimer: str
    top_reasons: list[ReasonItem]
    header_findings: HeaderFindingsOut
    iocs: IOCsOut
    model_note: str
