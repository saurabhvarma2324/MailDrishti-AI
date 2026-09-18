"""
main.py
-------
FastAPI app for MailDrishti AI.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Then either:
  - POST a raw .eml file to /api/analyze (multipart upload), or
  - POST raw .eml text as JSON to /api/analyze-text

Swagger UI (auto-generated docs, useful for your demo video too):
    http://localhost:8000/docs
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.pipeline import analyze_raw_email, _LEDGER

app = FastAPI(
    title="MailDrishti AI",
    description="AI-assisted email threat detection, IOC extraction, and forensic intelligence API. "
                "For authorized investigator use — findings are AI-assisted, not proof of a crime.",
    version="0.1.0",
)

# Wide-open CORS for local hackathon dev. TIGHTEN this before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RawEmailIn(BaseModel):
    raw_eml: str


@app.get("/")
def root():
    return {
        "service": "MailDrishti AI",
        "status": "ok",
        "endpoints": ["/api/analyze (file upload)", "/api/analyze-text (raw text)", "/docs"],
    }

@app.get("/api/ledger/verify")
def verify_ledger():
    return _LEDGER.verify_chain()


@app.get("/api/ledger")
def get_ledger_summary():
    return {"chain": _LEDGER.summary()}

@app.post("/api/analyze")
async def analyze_uploaded_email(file: UploadFile = File(...)):
    raw_bytes = await file.read()
    try:
        raw_text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raw_text = raw_bytes.decode("latin-1")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    result = analyze_raw_email(raw_text)
    result.pop("_relay_hops_full", None)
    return result


@app.post("/api/analyze-text")
def analyze_text_email(payload: RawEmailIn):
    if not payload.raw_eml.strip():
        raise HTTPException(status_code=400, detail="raw_eml is empty.")
    result = analyze_raw_email(payload.raw_eml)
    result.pop("_relay_hops_full", None)
    return result
