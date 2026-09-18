"""
header_forensics.py
--------------------
Stage 2: the "Email Header and Protocol Analysis Module" the official
problem statement calls out by name. This is what most simple phishing
detectors SKIP — and it's what makes this a forensics tool instead of
a spam filter.

What it does:
  1. Reads the Authentication-Results header to see if the email PASSED
     or FAILED SPF, DKIM, and DMARC checks (these are set by the
     RECEIVING mail server, which already did the hard cryptographic
     verification for us — we just have to read and interpret it).
  2. Walks the chain of "Received:" headers to reconstruct the path the
     email took hop by hop, and pulls out every IP address it touched.
  3. Flags classic spoofing patterns:
       - display name says "HDFC Bank Support" but the actual address
         is something like security-alert@mail-hdfc-verify.com
       - Reply-To is a different domain than From (classic BEC trick:
         reply goes somewhere the victim doesn't notice)
       - Return-Path domain doesn't match the From domain

Note on realism: full SPF/DKIM/DMARC validation from scratch requires
live DNS lookups against the *original* sending IP at the time the mail
was sent, which is only reliably possible in real-time at the receiving
mail server. Forensic tools (and this one) instead read the verification
the receiving server already performed and stamped into
Authentication-Results — this is the standard, realistic approach used
by real mail security products, not a shortcut.
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field

IP_PATTERN = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b"
)

DISPLAY_NAME_RE = re.compile(r'^\s*"?([^"<]*)"?\s*<?([^<>]*)>?\s*$')

# Brands commonly impersonated in phishing/BEC — used only to flag a
# DISPLAY NAME vs ACTUAL DOMAIN mismatch, never to accuse a real sender.
COMMON_IMPERSONATION_TARGETS = [
    "bank", "support", "security", "admin", "helpdesk", "hr", "payroll",
    "invoice", "accounts", "it department", "ceo", "cfo", "finance",
]


@dataclass
class HeaderFindings:
    spf_result: str | None = None
    dkim_result: str | None = None
    dmarc_result: str | None = None
    auth_results_raw: str | None = None

    relay_hops: list[dict] = field(default_factory=list)   # ordered, first hop = earliest/likely origin
    origin_ip_candidate: str | None = None

    display_name: str = ""
    from_address: str = ""
    from_domain: str = ""

    reply_to_address: str = ""
    reply_to_domain: str = ""
    reply_to_mismatch: bool = False

    return_path_domain: str = ""
    return_path_mismatch: bool = False

    display_name_impersonation_flag: bool = False
    display_name_domain_mismatch_reason: str = ""

    flags: list[str] = field(default_factory=list)   # human-readable forensic findings


def _domain_of(address: str) -> str:
    address = address.strip().strip("<>")
    if "@" in address:
        return address.split("@")[-1].lower().strip(">").strip()
    return ""


def _parse_auth_results(headers: dict[str, list[str]]) -> tuple[str | None, str | None, str | None, str | None]:
    raw_values = headers.get("Authentication-Results", [])
    if not raw_values:
        return None, None, None, None
    raw = "; ".join(raw_values)

    def find(tag: str) -> str | None:
        m = re.search(rf"{tag}=(\w+)", raw, re.IGNORECASE)
        return m.group(1).lower() if m else None

    return find("spf"), find("dkim"), find("dmarc"), raw


def _parse_display_name_and_address(from_raw: str) -> tuple[str, str]:
    m = DISPLAY_NAME_RE.match(from_raw or "")
    if not m:
        return "", from_raw.strip()
    display, addr = m.group(1).strip(), m.group(2).strip()
    if not addr and "@" in display:
        # "From: someone@domain.com" with no display name / brackets
        addr, display = display, ""
    return display, addr


def _walk_received_chain(headers: dict[str, list[str]]) -> tuple[list[dict], str | None]:
    """
    Received headers are stacked newest-first (the LAST mail server to
    touch the message adds ITS Received header at the top). So the
    OLDEST hop, closest to the true origin, is the LAST one in the list.
    """
    received = headers.get("Received", [])
    hops = []
    for idx, hop_text in enumerate(received):
        ips = IP_PATTERN.findall(hop_text)
        from_match = re.search(r"from\s+([^\s]+)", hop_text, re.IGNORECASE)
        by_match = re.search(r"by\s+([^\s]+)", hop_text, re.IGNORECASE)
        hops.append({
            "hop_index_from_recipient": idx,   # 0 = closest to recipient (added last)
            "from_host": from_match.group(1) if from_match else None,
            "by_host": by_match.group(1) if by_match else None,
            "ips_found": ips,
            "raw": hop_text.strip()[:300],
        })

    origin_candidate = None
    # The earliest hop (end of the list) with a public-looking IP is our
    # best candidate for the true originating server.
    for hop in reversed(hops):
        for ip in hop["ips_found"]:
            if not ip.startswith(("10.", "127.", "192.168.")) and not ip.startswith("172."):
                origin_candidate = ip
                break
        if origin_candidate:
            break

    return hops, origin_candidate


def analyze_headers(parsed_email) -> HeaderFindings:
    f = HeaderFindings()

    f.spf_result, f.dkim_result, f.dmarc_result, f.auth_results_raw = _parse_auth_results(parsed_email.headers)

    f.relay_hops, f.origin_ip_candidate = _walk_received_chain(parsed_email.headers)

    display, from_addr = _parse_display_name_and_address(parsed_email.from_raw)
    f.display_name = display
    f.from_address = from_addr
    f.from_domain = _domain_of(from_addr)

    reply_addr = parsed_email.reply_to_raw.strip().strip("<>")
    f.reply_to_address = reply_addr
    f.reply_to_domain = _domain_of(reply_addr) if reply_addr else ""
    if f.reply_to_domain and f.reply_to_domain != f.from_domain:
        f.reply_to_mismatch = True

    f.return_path_domain = _domain_of(parsed_email.return_path_raw)
    if f.return_path_domain and f.from_domain and f.return_path_domain != f.from_domain:
        f.return_path_mismatch = True

    # --- Build human-readable flags ---
    if f.spf_result and f.spf_result != "pass":
        f.flags.append(f"SPF check result: {f.spf_result.upper()} (sender IP not authorized for this domain)")
    if f.dkim_result and f.dkim_result != "pass":
        f.flags.append(f"DKIM check result: {f.dkim_result.upper()} (message signature invalid or missing)")
    if f.dmarc_result and f.dmarc_result != "pass":
        f.flags.append(f"DMARC check result: {f.dmarc_result.upper()} (fails domain owner's authentication policy)")

    if f.reply_to_mismatch:
        f.flags.append(
            f"Reply-To domain ({f.reply_to_domain}) differs from From domain ({f.from_domain}) "
            f"— replies would be redirected silently, a classic BEC pattern"
        )
    if f.return_path_mismatch:
        f.flags.append(
            f"Return-Path domain ({f.return_path_domain}) differs from From domain ({f.from_domain})"
        )

    display_lower = display.lower()
    if any(word in display_lower for word in COMMON_IMPERSONATION_TARGETS):
        # Display name LOOKS official/trusted — check if the domain backs that up.
        # Only consider meaningful word tokens (3+ alphabetic chars) so stray
        # punctuation (e.g. a bare "-") can't accidentally "match" inside a
        # hyphenated domain and mask a real impersonation.
        meaningful_parts = [p for p in display_lower.split() if len(p) >= 3 and p.isalpha()]
        if f.from_domain and not any(part in f.from_domain for part in meaningful_parts):
            f.display_name_impersonation_flag = True
            f.display_name_domain_mismatch_reason = (
                f'Display name "{display}" suggests an official/trusted sender, '
                f"but the actual sending domain is \"{f.from_domain}\", which does not match"
            )
            f.flags.append(f.display_name_domain_mismatch_reason)

    return f
