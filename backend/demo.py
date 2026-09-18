"""
demo.py
-------
Quick end-to-end test — no server needed. Good for your demo video:
run this, screen-record the terminal output, and narrate it.

Usage:
    python demo.py sample_emails/sample_bec_fraud.eml
    python demo.py sample_emails/sample_legitimate.eml
"""

import sys
import json
from app.pipeline import analyze_raw_email


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "sample_emails/sample_bec_fraud.eml"
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    result = analyze_raw_email(raw)
    result.pop("_relay_hops_full", None)

    print("=" * 70)
    print(f"MAILDRISHTI AI — Forensic Analysis of: {path}")
    print("=" * 70)
    print(f"Subject     : {result['subject']}")
    print(f"From        : {result['from_address']}")
    print(f"Risk Score  : {result['risk_score']} / 100")
    print(f"Risk Label  : {result['risk_label']}")
    print(f"\n{result['ai_disclaimer']}")

    print("\n--- WHY (top contributing reasons) ---")
    if result["top_reasons"]:
        for r in result["top_reasons"]:
            print(f"  [+{r['contribution']:.2f}] {r['reason']}")
    else:
        print("  No significant risk indicators found.")

    print("\n--- HEADER / PROTOCOL FORENSICS ---")
    hf = result["header_findings"]
    print(f"  SPF={hf['spf_result']}  DKIM={hf['dkim_result']}  DMARC={hf['dmarc_result']}")
    print(f"  Origin IP candidate : {hf['origin_ip_candidate']}")
    print(f"  Relay hops observed : {hf['relay_hop_count']}")
    for flag in hf["flags"]:
        print(f"  FLAG: {flag}")

    print("\n--- EXTRACTED IOCs ---")
    iocs = result["iocs"]
    print(f"  URLs             : {iocs['urls']}")
    print(f"  Suspicious/short : {iocs['shortened_or_suspicious_urls']}")
    print(f"  IP addresses     : {iocs['ip_addresses']}")
    print(f"  Email addresses  : {iocs['email_addresses']}")
    print(f"  Risky attachments: {iocs['risky_attachments']}")

    print(f"\n[model note] {result['model_note']}")
    print("=" * 70)

    with open("last_result.json", "w") as f:
        json.dump(result, f, indent=2)
    print("Full JSON written to last_result.json")


if __name__ == "__main__":
    main()
