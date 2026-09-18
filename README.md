# MailDrishti AI

**From Suspicious Email to Explainable Forensic Intelligence**

AI-assisted email threat detection, geolocation, and forensic intelligence
platform for authorized cybersecurity investigators — built for
Smart India Hackathon 2026, Problem Statement SIH26106
("AI-Powered Email Threat Detection, GeoLocation and Forensic
Intelligence Platform"), Theme: Blockchain & Cybersecurity.

**Team:** Sentrix

## The idea

Most phishing tools just answer "is this email malicious?" MailDrishti AI
answers a bigger question: *what evidence does this email contain, how
are those indicators connected, where do they point geographically, and
how can an investigator understand the complete picture?* The AI assists
the investigator — it never claims to prove a crime; every finding is
explainable and requires human verification.

## Architecture

```
React Frontend (frontend/, port 5173)
        │  (only talks to Node — never directly to Python)
        ▼
Node.js / Express Gateway (node-backend/, port 5000)
        │  auth (JWT) · MongoDB · orchestrates the AI service
        ▼
Python / FastAPI AI Engine (backend/, port 8000)
        │  email parsing · header forensics · IOC extraction
        │  explainable risk scoring · blockchain evidence ledger
```

## What's actually built

- **Email parsing & header forensics** — SPF/DKIM/DMARC interpretation,
  relay-chain reconstruction, display-name/reply-to spoofing detection
- **Explainable AI risk engine** — a linear, domain-weighted scoring
  model; every score comes with a plain-English "why" breakdown, not a
  black-box number
- **Threat type classification** — categorizes findings (BEC, Credential
  Phishing, Malware Delivery, Authentication Anomaly, etc.) from the
  same feature contributions used for scoring
- **IOC extraction** — URLs, domains, IPs, emails, risky attachments
- **Geolocation** — live lookup with an offline fallback so the demo
  never depends on internet reliability
- **Relationship graph** — visualizes shared infrastructure across
  "unrelated" emails
- **Investigation timeline, notes, case status, and PDF-exportable
  reports**
- **Blockchain evidence ledger** — a tamper-evident hash-chain that
  seals every analysis; a live "Verify Evidence Integrity" check proves
  the chain hasn't been altered

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Recharts,
  React Flow, Leaflet, Lucide Icons
- **Backend (gateway):** Node.js, Express, MongoDB (Mongoose), JWT auth
- **AI Engine:** Python, FastAPI, scikit-learn, dnspython

## Running it locally

Three services, three terminals, in this order:

```bash
# 1. Python AI engine
cd backend
python -m venv venv
venv\Scripts\activate          # (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 2. Node gateway (needs a MongoDB Atlas connection string in .env —
#    copy node-backend/.env.example to node-backend/.env and fill it in)
cd node-backend
npm install
npm start

# 3. React frontend
cd frontend
npm install
npm run dev
```

Then open the frontend's local URL (usually `http://localhost:5173`).

**Demo login:** `investigator@maildrishti.ai` / `Demo@123`
(register it once via `POST /api/auth/register` if it doesn't exist yet
in your database.)

Sample `.eml` test files are in `backend/sample_emails/` — covering BEC
fraud, credential phishing, malware delivery, a medium-risk
authentication anomaly, and a clean legitimate baseline.

## Project structure

```
maildrishti-ai/
    backend/            Python FastAPI — the AI/forensics engine
    node-backend/        Node/Express — auth, MongoDB, API gateway
    frontend/            React — the investigator dashboard
    .gitignore
    README.md
```

## Important notes

- **AI-assisted, not conclusive.** Every finding carries a disclaimer:
  this does not constitute proof of a crime and requires investigator
  verification.
- **Bootstrap risk model.** The scoring weights are domain-informed, not
  trained on a large real-world labeled dataset — a deliberate, honest
  choice for demo reliability. Retraining on a real labeled corpus is
  listed as future work.
- **Future scope:** real labeled-dataset model training, an admin panel,
  a notification system, and anchoring the evidence ledger to a public
  blockchain testnet as an optional integrity bonus.
