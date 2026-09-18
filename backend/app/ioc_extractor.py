"""
ioc_extractor.py
-----------------
Stage 3: pull Indicators of Compromise (IOCs) out of the email body and
headers. These are the atomic pieces of evidence every later stage
(IP/domain intel, geolocation, correlation graph) hangs off of.

We extract:
  - URLs (and flag shortened / redirect-style links, a common evasion trick)
  - Bare domains mentioned in text
  - IP addresses (body + headers)
  - Email addresses seen anywhere in the message
  - Attachment filenames + extensions (flagging risky types)

Kept deliberately dependency-free (just regex) so it's fast and has zero
external calls — this stage should never be the thing that fails during
a live demo.
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

URL_RE = re.compile(r"https?://[^\s\"'<>\)]+", re.IGNORECASE)
IP_RE = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b"
)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at",
}

RISKY_ATTACHMENT_EXTENSIONS = {
    ".exe", ".scr", ".js", ".vbs", ".bat", ".cmd", ".jar",
    ".msi", ".ps1", ".hta", ".zip", ".iso", ".lnk",
}


@dataclass
class ExtractedIOCs:
    urls: list[str] = field(default_factory=list)
    shortened_or_suspicious_urls: list[str] = field(default_factory=list)
    domains: list[str] = field(default_factory=list)
    ip_addresses: list[str] = field(default_factory=list)
    email_addresses: list[str] = field(default_factory=list)
    risky_attachments: list[str] = field(default_factory=list)


def extract_iocs(parsed_email, header_findings) -> ExtractedIOCs:
    combined_text = f"{parsed_email.subject}\n{parsed_email.body_text}\n{parsed_email.body_html}"

    urls = sorted(set(URL_RE.findall(combined_text)))
    domains = set()
    shortened = []

    for url in urls:
        try:
            netloc = urlparse(url).netloc.lower()
        except Exception:
            continue
        if netloc:
            domains.add(netloc)
        if netloc in SHORTENER_DOMAINS:
            shortened.append(url)

    ips_in_body = set(IP_RE.findall(combined_text))
    ips_in_headers = set()
    for hop in header_findings.relay_hops:
        ips_in_headers.update(hop.get("ips_found", []))
    if header_findings.origin_ip_candidate:
        ips_in_headers.add(header_findings.origin_ip_candidate)

    emails_found = set(EMAIL_RE.findall(combined_text))
    if header_findings.from_address:
        emails_found.add(header_findings.from_address)
    if header_findings.reply_to_address:
        emails_found.add(header_findings.reply_to_address)

    risky_attachments = [
        f for f in parsed_email.attachments
        if any(f.lower().endswith(ext) for ext in RISKY_ATTACHMENT_EXTENSIONS)
    ]

    return ExtractedIOCs(
        urls=urls,
        shortened_or_suspicious_urls=sorted(set(shortened)),
        domains=sorted(domains),
        ip_addresses=sorted(ips_in_body | ips_in_headers),
        email_addresses=sorted(e for e in emails_found if e),
        risky_attachments=risky_attachments,
    )
