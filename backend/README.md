# MailDrishti AI — Backend (Part 1: Detection & Explainability Engine)

This is the first working slice of MailDrishti AI, built for SIH26106
("AI-Powered Email Threat Detection, GeoLocation and Forensic
Intelligence Platform"). It covers two of the official brief's five
key components:

1. **Fraudulent Email Detection Engine** — NLP/heuristic pattern
   detection + an explainable ML risk score.
2. **Email Header and Protocol Analysis Module** — SPF/DKIM/DMARC
   interpretation, relay-chain reconstruction, spoofing/impersonation
   checks.

Not yet built (next parts): geolocation + IP/domain intel lookups,
graph-based entity correlation, the blockchain evidence ledger, and
the React frontend dashboard.

## Quick start

```bash
cd backend
pip install -r requirements.txt

# Option A: CLI demo, no server, good for screen-recording your video
python demo.py sample_emails/sample_bec_fraud.eml
python demo.py sample_emails/sample_legitimate.eml

# Option B: run the actual API
uvicorn main:app --reload --port 8000
# then open http://localhost:8000/docs and try /api/analyze
```

## How it actually works (read this before your jury round)

**Pipeline:** `email_parser.py` → `header_forensics.py` →
`ioc_extractor.py` → `risk_engine.py`, wired together in
`pipeline.py`. Each stage is a separate file on purpose — you can
explain any one of them in isolation, and swapping one stage later
(e.g. plugging in a real threat-intel API) won't touch the others.

**SPF/DKIM/DMARC:** we don't re-implement cryptographic verification
ourselves — no forensic tool does that from scratch. The *receiving*
mail server already checked this and stamped the result into the
`Authentication-Results` header. We parse that. This is the standard,
realistic approach.

**The relay chain:** `Received:` headers stack newest-first (each
server that touches the mail adds its own line on top). We walk the
chain and take the oldest hop with a public IP as the likely origin —
explain this exact logic if asked "how do you find the origin IP?"

**The AI risk score — be straight about this one:** it's a **logistic
regression**, not a black box. We chose it deliberately: a
logistic regression's output is a weighted sum of its inputs, so "why
82/100?" has a literal answer — these specific features, each
contributing this much (see `top_reasons` in the output). That
traceability is what "explainable" means here, and it's worth more to
an investigator than a couple of extra accuracy points from a fancier
model.

**Training data — the most important thing to say honestly out
loud:** the model is trained on a small **synthetic, hand-designed**
dataset (`build_training_data()` in `risk_engine.py`) that encodes
known phishing/BEC patterns as feature combinations — not a real
labeled email corpus. This is a completely normal thing for a
hackathon bootstrap model. If a judge asks "what's your training
data?", say exactly this, and say what you'd do next: retrain on a
real public phishing/ham dataset or your institution's own reported
incidents. Claiming it's something it isn't is the actual risk here —
being upfront isn't.

## Sample data

Both `.eml` files in `sample_emails/` are entirely made up by us for
testing — a synthetic BEC/wire-fraud email and a synthetic legitimate
one. Use them for your demo video; feel free to write more.

## What to build next (in priority order)

1. **IP geolocation + domain intel** — take `origin_ip_candidate` and
   every IP/domain in `iocs`, look up geolocation (e.g. a free GeoIP
   API or offline database) and WHOIS/DNS info. This is what turns
   "origin IP" into "likely origin country/ISP" on a map.
2. **Blockchain evidence ledger** — hash the full analysis result +
   the original raw email, and chain each hash to the previous one
   (a simple `hash(prev_hash + this_record)` linked list is
   architecturally a real blockchain — you don't need a public
   testnet for this to be legitimate, though anchoring the root hash
   externally is a nice bonus). This is your answer to "why does this
   need blockchain?" — tamper-evident chain of custody for the
   evidence, exactly what the official brief asks for under
   "Privacy, Legal, and Compliance Safeguards."
3. **Correlation graph** — once you're analyzing more than one email,
   store IOCs in a small graph (domains ↔ IPs ↔ senders ↔ reply-to
   addresses) so repeated infrastructure across emails becomes
   visible.
4. **React dashboard** — risk score, reasons, header flags, IOC list,
   and (once built) the geolocation map and graph, all reading from
   `/api/analyze`.
5. **Forensic report generation** — a PDF/structured export of one
   analysis for investigator sign-off, including the blockchain hash
   as a tamper-evidence certificate.
