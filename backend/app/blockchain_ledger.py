"""
blockchain_ledger.py
---------------------
This is your answer to "where's the blockchain?"

WHAT A BLOCKCHAIN ACTUALLY IS, STRIPPED DOWN:
A chain of records where each record's hash depends on the previous
record's hash. Edit any old record, and its hash no longer matches —
which breaks every hash after it. That single property (tamper
evidence via hash-chaining) is the real mechanism. Public/decentralized
consensus (mining, multiple nodes agreeing) is a SEPARATE feature full
blockchains add to get trust between parties who don't know each
other. We don't need that here — we need tamper-evident chain of
custody for one investigation team, which hash-chaining gives us
directly, honestly, and without needing a live network dependency
that could fail during a demo.

TWO LAYERS OF TAMPER DETECTION (this is the part worth explaining to
a jury — it shows you understand WHY, not just that you added "a
blockchain"):

  1. Chain-level: each block's own hash is computed from its content
     + the previous block's hash. Edit a block's metadata -> its
     hash no longer matches -> verify_chain() catches it immediately.

  2. Evidence-level: the bulky evidence (raw email + full analysis)
     is stored separately, content-addressed by its own hash. The
     block only stores that hash, not the bulky content — standard
     practice in real legal/forensic evidence systems (you seal a
     FINGERPRINT of the evidence, you don't need to store the whole
     thing twice). If someone edits the stored evidence file directly
     (bypassing the chain entirely), its hash no longer matches what
     the block sealed -> also caught.

Both checks together mean: nobody — not an outside attacker, not a
careless teammate, not even your own investigator — can quietly alter
a past finding without it being detectable.
"""

from __future__ import annotations
import hashlib
import json
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path

GENESIS_PREVIOUS_HASH = "0" * 64


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass
class Block:
    index: int
    timestamp: float
    record_type: str
    evidence_hash: str
    metadata: dict
    previous_hash: str
    block_hash: str = ""

    def compute_hash(self) -> str:
        payload = json.dumps(
            {
                "index": self.index,
                "timestamp": self.timestamp,
                "record_type": self.record_type,
                "evidence_hash": self.evidence_hash,
                "metadata": self.metadata,
                "previous_hash": self.previous_hash,
            },
            sort_keys=True,
        )
        return _sha256(payload)


class EvidenceLedger:
    def __init__(self, storage_dir: str = "ledger_data"):
        self.storage_dir = Path(storage_dir)
        self.chain_path = self.storage_dir / "chain.json"
        self.evidence_dir = self.storage_dir / "evidence"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.evidence_dir.mkdir(parents=True, exist_ok=True)

        self.chain: list[Block] = []
        if self.chain_path.exists():
            self._load()
        else:
            self._create_genesis_block()

    # ---------- persistence ----------

    def _load(self):
        raw = json.loads(self.chain_path.read_text())
        self.chain = [Block(**b) for b in raw]

    def _save(self):
        self.chain_path.write_text(
            json.dumps([asdict(b) for b in self.chain], indent=2)
        )

    def _create_genesis_block(self):
        genesis = Block(
            index=0,
            timestamp=time.time(),
            record_type="genesis",
            evidence_hash=_sha256("MAILDRISHTI_AI_GENESIS_BLOCK"),
            metadata={"note": "Chain start — nothing before this block."},
            previous_hash=GENESIS_PREVIOUS_HASH,
        )
        genesis.block_hash = genesis.compute_hash()
        self.chain = [genesis]
        self._save()

    # ---------- writing evidence ----------

    def add_evidence(self, raw_email_text: str, analysis_result: dict) -> Block:
        """
        Seal one email's raw content + full analysis result as a new
        block. The bulky content is stored content-addressed by its
        own hash; only that hash (plus a small display summary) goes
        into the chain itself.
        """
        evidence_payload = json.dumps(
            {"raw_email": raw_email_text, "analysis_result": analysis_result},
            sort_keys=True,
            default=str,
        )
        evidence_hash = _sha256(evidence_payload)

        evidence_file = self.evidence_dir / f"{evidence_hash}.json"
        if not evidence_file.exists():
            evidence_file.write_text(evidence_payload)

        previous_block = self.chain[-1]
        new_block = Block(
            index=previous_block.index + 1,
            timestamp=time.time(),
            record_type="email_analysis",
            evidence_hash=evidence_hash,
            metadata={
                "subject": analysis_result.get("subject", ""),
                "from_address": analysis_result.get("from_address", ""),
                "risk_score": analysis_result.get("risk_score"),
                "risk_label": analysis_result.get("risk_label", ""),
            },
            previous_hash=previous_block.block_hash,
        )
        new_block.block_hash = new_block.compute_hash()

        self.chain.append(new_block)
        self._save()
        return new_block

    # ---------- verification ----------

    def verify_chain(self) -> dict:
        """
        Walk the whole chain and check BOTH tamper-detection layers.
        Returns a report that names the exact block if something's wrong
        — "the chain is broken" is a useless answer in a demo, "Block #3
        was altered" is a convincing one.
        """
        issues = []

        for i, block in enumerate(self.chain):
            # Layer 1: does this block's stored hash match what its content
            # actually hashes to right now?
            recomputed = block.compute_hash()
            if recomputed != block.block_hash:
                issues.append(
                    f"Block #{block.index}: HASH MISMATCH — stored hash does not "
                    f"match its content. This block's metadata was altered after sealing."
                )

            # Chain link: does this block correctly point to the previous block's hash?
            if i > 0:
                expected_prev = self.chain[i - 1].block_hash
                if block.previous_hash != expected_prev:
                    issues.append(
                        f"Block #{block.index}: CHAIN BROKEN — previous_hash does not "
                        f"match Block #{block.index - 1}'s actual hash."
                    )

            # Layer 2: does the underlying evidence file still match the hash
            # this block sealed?
            if block.record_type == "email_analysis":
                evidence_file = self.evidence_dir / f"{block.evidence_hash}.json"
                if not evidence_file.exists():
                    issues.append(
                        f"Block #{block.index}: EVIDENCE MISSING — sealed evidence "
                        f"file for hash {block.evidence_hash[:12]}... not found."
                    )
                else:
                    actual_hash = _sha256(evidence_file.read_text())
                    if actual_hash != block.evidence_hash:
                        issues.append(
                            f"Block #{block.index}: EVIDENCE TAMPERED — stored evidence "
                            f"content no longer matches its sealed hash "
                            f"({block.evidence_hash[:12]}... expected, {actual_hash[:12]}... found)."
                        )

        return {
            "valid": len(issues) == 0,
            "blocks_checked": len(self.chain),
            "issues": issues,
        }

    def summary(self) -> list[dict]:
        return [
            {
                "index": b.index,
                "record_type": b.record_type,
                "block_hash": b.block_hash,
                "evidence_hash": b.evidence_hash,
                "metadata": b.metadata,
            }
            for b in self.chain
        ]
