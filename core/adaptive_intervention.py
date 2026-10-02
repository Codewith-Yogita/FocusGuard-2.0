"""
Focus Guard 2.0 - Adaptive Intervention Manager
Implements the 5-Tier Escalation Hierarchy with non-punitive progressive intervention.
Governs modal prompts, cooldown timers, and active execution of chosen interventions.
"""

import time
from typing import Dict, Any, List, Optional


class AdaptiveInterventionManager:
    """
    Coordinates progressive escalation from gentle awareness to intelligent suggestion,
    guided refocusing, and finally application restriction.
    """

    def __init__(self):
        self.last_intervention_time: float = 0
        self.last_intervention_level: int = 0
        self.current_active_intervention: Optional[Dict[str, Any]] = None
        self.snooze_until: float = 0
        self.reset_activity_end: float = 0
        self.focus_lock_until: float = 0
        self.min_interval_seconds = 45  # Cooldown between prompts to prevent fatigue

    def should_trigger_intervention(self, risk_level: int) -> bool:
        """Determines if a new intervention prompt should be displayed to the user."""
        now = time.time()

        # If user is in an active snooze window
        if now < self.snooze_until:
            return False

        # If user is actively doing a guided reset (e.g. breathing timer)
        if now < self.reset_activity_end:
            return False

        # Level 0 is normal flow; no prompt needed
        if risk_level == 0:
            return False

        # If level escalated higher than last time, prompt immediately
        if risk_level > self.last_intervention_level:
            return True

        # Otherwise respect cooldown
        if (now - self.last_intervention_time) >= self.min_interval_seconds:
            return True

        return False

    def trigger_intervention(
        self,
        recommendation: Dict[str, Any],
        risk_score: int,
        intent_id: str
    ) -> Dict[str, Any]:
        """Activates and logs the current intervention."""
        now = time.time()
        self.last_intervention_time = now
        self.last_intervention_level = recommendation.get("tier_level", 1)

        self.current_active_intervention = {
            "intervention_id": f"int_{int(now)}_{self.last_intervention_level}",
            "intent_id": intent_id,
            "timestamp": now,
            "tier_level": self.last_intervention_level,
            "risk_score": risk_score,
            "headline": recommendation.get("headline", ""),
            "message": recommendation.get("message", ""),
            "rationale": recommendation.get("rationale", ""),
            "actions": recommendation.get("actions", []),
            "engine_used": recommendation.get("engine_used", "DETERMINISTIC"),
            "status": "PROMPTED"
        }
        return dict(self.current_active_intervention)

    def handle_user_action(
        self,
        intervention_id: str,
        action_id: str
    ) -> Dict[str, Any]:
        """
        Executes the user's selected intervention response.
        Applies necessary timers (snooze, reset, break, lock).
        """
        now = time.time()
        response_data = {
            "intervention_id": intervention_id,
            "action_id": action_id,
            "status": "ACCEPTED",
            "message": "Action applied."
        }

        if action_id == "RETURN_TO_GOAL":
            # Give user a 3-minute grace window to transition back
            self.snooze_until = now + 180
            response_data["message"] = "Returning to focus goal. 3-minute grace period active."

        elif action_id == "BREATH_RESET":
            # 3-minute reset activity (180s)
            self.reset_activity_end = now + 180
            response_data["reset_seconds"] = 180
            response_data["message"] = "Starting 3-minute guided breath reset."

        elif action_id == "SHORT_BREAK":
            # 5-minute scheduled break (300s)
            self.snooze_until = now + 300
            response_data["break_seconds"] = 300
            response_data["message"] = "5-minute focus break started."

        elif action_id == "FOCUS_LOCK":
            # 20-minute strict focus lock (1200s)
            self.focus_lock_until = now + 1200
            response_data["lock_seconds"] = 1200
            response_data["message"] = "Focus Lock engaged for 20 minutes."

        elif action_id == "SNOOZE_2M":
            # 2-minute snooze (120s)
            self.snooze_until = now + 120
            response_data["status"] = "SNOOZED"
            response_data["message"] = "Intervention snoozed for 2 minutes."

        elif action_id == "DISMISS":
            # Dismissed without action; enforce 60s cooldown
            self.snooze_until = now + 60
            response_data["status"] = "DISMISSED"
            response_data["message"] = "Intervention dismissed."

        return response_data

    def is_focus_locked(self) -> bool:
        """Returns True if the system is currently under an active Level 4 Focus Lock."""
        return time.time() < self.focus_lock_until


intervention_manager = AdaptiveInterventionManager()
