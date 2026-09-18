"""
email_parser.py
----------------
Stage 1 of the pipeline: turn a raw .eml file into structured data
we can actually analyze (headers as a dict, plain text body, HTML body,
and a list of attachment filenames).

Why this exists as its own module:
Every later stage (header forensics, IOC extraction, risk scoring)
needs clean structured input. Keeping parsing separate means we can
swap in a different mail source later (e.g. an IMAP inbox, or a
.msg/Outlook file) without touching the analysis logic.
"""

from __future__ import annotations
from email import message_from_string, policy
from email.message import Message
from dataclasses import dataclass, field


@dataclass
class ParsedEmail:
    headers: dict[str, list[str]]   # header name -> list of values (headers can repeat, e.g. "Received")
    subject: str
    from_raw: str
    to_raw: str
    reply_to_raw: str
    return_path_raw: str
    date_raw: str
    body_text: str
    body_html: str
    attachments: list[str] = field(default_factory=list)
    raw_source: str = ""


def _get_all(msg: Message, name: str) -> list[str]:
    """Return ALL values for a header name (e.g. every 'Received' line, in order)."""
    return [str(v) for v in msg.get_all(name, [])]


def parse_eml(raw_text: str) -> ParsedEmail:
    """
    Parse raw .eml source text into a ParsedEmail.
    Uses the modern `policy.default` parser so headers are decoded
    (MIME-encoded subjects, display names, etc.) automatically.
    """
    msg = message_from_string(raw_text, policy=policy.default)

    # Collect every header, preserving duplicates (Received chains matter a lot later)
    headers: dict[str, list[str]] = {}
    for name in msg.keys():
        headers[name] = _get_all(msg, name)

    body_text = ""
    body_html = ""
    attachments: list[str] = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition") or "")

            if "attachment" in disposition or part.get_filename():
                fname = part.get_filename()
                if fname:
                    attachments.append(fname)
                continue

            if content_type == "text/plain" and not body_text:
                try:
                    body_text = part.get_content()
                except Exception:
                    body_text = part.get_payload(decode=True) and part.get_payload(decode=True).decode(
                        "utf-8", errors="replace"
                    ) or ""
            elif content_type == "text/html" and not body_html:
                try:
                    body_html = part.get_content()
                except Exception:
                    body_html = part.get_payload(decode=True) and part.get_payload(decode=True).decode(
                        "utf-8", errors="replace"
                    ) or ""
    else:
        try:
            content = msg.get_content()
        except Exception:
            content = msg.get_payload()
        if msg.get_content_type() == "text/html":
            body_html = content
        else:
            body_text = content

    return ParsedEmail(
        headers=headers,
        subject=str(msg.get("Subject", "")),
        from_raw=str(msg.get("From", "")),
        to_raw=str(msg.get("To", "")),
        reply_to_raw=str(msg.get("Reply-To", "")),
        return_path_raw=str(msg.get("Return-Path", "")),
        date_raw=str(msg.get("Date", "")),
        body_text=body_text or "",
        body_html=body_html or "",
        attachments=attachments,
        raw_source=raw_text,
    )
