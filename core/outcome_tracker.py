"""
Focus Guard 2.0 - Outcome Tracker
Tracks what happens after each adaptive intervention:
User Choice (Accept / Dismiss / Snooze) and Post-Intervention Verification (Did user recover focus?).
"""

import os
import json
import time
from typing import Dict, Any, List, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
OUTCOMES_FILE = os.path.join(DATA_DIR, "outcomes.json")


class OutcomeTracker:
    """
    Maintains empirical record of interventions and verifies post-intervention recovery.
    """

    def __init__(self):
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(OUTCOMES_FILE):
            with open(OUTCOMES_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)

    def _load_outcomes(self) -> List[Dict[str, Any]]:
        try:
            with open(OUTCOMES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_outcomes(self, outcomes: List[Dict[str, Any]]):
        try:
            with open(OUTCOMES_FILE, "w", encoding="utf-8") as f:
                json.dump(outcomes, f, indent=2)
        except Exception as e:
            print(f"[OutcomeTracker Error] Failed saving outcomes: {e}")

    def record_prompt(
        self,
        intervention_id: str,
        user_id: str,
        intent_id: str,
        tier_level: int,
        risk_score: int,
        headline: str,
        rationale: str
    ) -> Dict[str, Any]:
        """Logs when an intervention prompt is first displayed."""
        now = time.time()
        record = {
            "intervention_id": intervention_id,
            "user_id": user_id,
            "intent_id": intent_id,
            "timestamp": now,
            "time_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
            "tier_level": tier_level,
            "risk_score": risk_score,
            "headline": headline,
            "rationale": rationale,
            "action_chosen": "NONE",
            "response_status": "PENDING_USER_RESPONSE",
            "verify_at": now + 180,  # Verify recovery after 3 minutes (180s)
            "recovery_outcome": "PENDING_VERIFICATION"
        }
        outcomes = self._load_outcomes()
        outcomes.append(record)
        self._save_outcomes(outcomes)
        return record

    def record_user_response(
        self,
        intervention_id: str,
        action_id: str,
        response_status: str = "ACCEPTED"
    ) -> Optional[Dict[str, Any]]:
        """Updates the record with user's explicit response."""
        outcomes = self._load_outcomes()
        updated = None
        for item in outcomes:
            if item.get("intervention_id") == intervention_id:
                item["action_chosen"] = action_id
                item["response_status"] = response_status
                item["responded_at"] = time.time()
                updated = item
                break
        if updated:
            self._save_outcomes(outcomes)
        return updated

    def verify_pending_outcomes(
        self,
        current_classification: str,
        current_risk_score: int
    ) -> List[Dict[str, Any]]:
        """
        Background verification: Evaluates whether user successfully recovered
        or remained distracted after the grace window.
        """
        now = time.time()
        outcomes = self._load_outcomes()
        changed = False
        resolved = []

        for item in outcomes:
            if item.get("recovery_outcome") == "PENDING_VERIFICATION":
                verify_at = item.get("verify_at", 0)
                # If grace period elapsed
                if now >= verify_at:
                    if current_classification == "ALIGNED" or current_risk_score < 35:
                        item["recovery_outcome"] = "SUCCESSFUL_RECOVERY"
                    elif current_risk_score < 60:
                        item["recovery_outcome"] = "PARTIAL_RECOVERY"
                    else:
                        item["recovery_outcome"] = "DRIFT_PERSISTED"
                    item["verified_at"] = now
                    resolved.append(item)
                    changed = True

        if changed:
            self._save_outcomes(outcomes)
        return resolved

    def get_history(self, user_id: str = "default_user", limit: int = 20) -> List[Dict[str, Any]]:
        """Returns recent outcome history for this user."""
        outcomes = self._load_outcomes()
        user_items = [o for o in outcomes if o.get("user_id", "default_user") == user_id]
        return list(reversed(user_items[-limit:]))


outcome_tracker = OutcomeTracker()
