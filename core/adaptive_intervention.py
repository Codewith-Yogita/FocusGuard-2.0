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
        self.return_to_goal_attempts: int = 0
        self.min_interval_seconds = 25  # Shorter interval to catch quick diversions
        self.freeze_punishment_until: float = 0
        self.freeze_punishment_reason: str = ""
        self.freeze_punishment_app: str = ""
        self.restrictions_paused: bool = False
        self.restrictions_pause_reason: str = ""

    def set_restrictions_paused(self, paused: bool, reason: str = ""):
        """Sets whether restrictions are paused (e.g. when guest is watching or user is away)."""
        self.restrictions_paused = paused
        self.restrictions_pause_reason = reason
        if paused:
            self.clear_freeze_punishment()
            self.current_active_intervention = None

    def are_restrictions_paused(self) -> bool:
        """Returns True if restrictions are currently suspended for guest or away mode."""
        return self.restrictions_paused

    def reset(self):
        """Resets intervention counters for a fresh focus session."""
        self.last_intervention_time = 0
        self.last_intervention_level = 0
        self.current_active_intervention = None
        self.snooze_until = 0
        self.reset_activity_end = 0
        self.focus_lock_until = 0
        self.return_to_goal_attempts = 0
        self.freeze_punishment_until = 0
        self.freeze_punishment_reason = ""
        self.freeze_punishment_app = ""
        self.restrictions_paused = False
        self.restrictions_pause_reason = ""

    def should_trigger_intervention(self, risk_level: int) -> bool:
        """Determines if a new intervention prompt should be displayed to the user."""
        if self.restrictions_paused:
            return False

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

        # If user previously committed to return to goal and is drifting again, prompt immediately!
        if self.return_to_goal_attempts >= 1 and risk_level >= 2:
            return True

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

        # If repeated diversion after returning to goal, escalate tier to Level 4
        effective_level = recommendation.get("tier_level", 1)
        if self.return_to_goal_attempts >= 1:
            effective_level = max(3, effective_level)
        if self.return_to_goal_attempts >= 2:
            effective_level = 4
            self.focus_lock_until = now + 1200
            try:
                from .behavior_monitor import behavior_monitor
                behavior_monitor.minimize_current_distracting_window()
            except Exception:
                pass

        self.last_intervention_level = effective_level

        self.current_active_intervention = {
            "intervention_id": f"int_{int(now)}_{self.last_intervention_level}",
            "intent_id": intent_id,
            "timestamp": now,
            "tier_level": self.last_intervention_level,
            "risk_score": max(risk_score, 75 if self.return_to_goal_attempts >= 1 else risk_score),
            "headline": "Focus Lock Engaged — Repeated Diversion" if effective_level == 4 else recommendation.get("headline", ""),
            "message": "You returned to distraction after committing to return to your goal. Level 4 Focus Lock is now active." if effective_level == 4 else recommendation.get("message", ""),
            "rationale": "Broken commitment: digital distraction persisted after return prompt." if effective_level == 4 else recommendation.get("rationale", ""),
            "target_url": recommendation.get("target_url", "https://leetcode.com/problemset/all/"),
            "target_label": recommendation.get("target_label", "Goal Workspace"),
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
        target_url = ""
        target_label = ""
        if self.current_active_intervention:
            target_url = self.current_active_intervention.get("target_url", "")
            target_label = self.current_active_intervention.get("target_label", "")

        response_data = {
            "intervention_id": intervention_id,
            "action_id": action_id,
            "status": "ACCEPTED",
            "target_url": target_url,
            "target_label": target_label,
            "message": "Action applied."
        }

        if action_id in ("RETURN_TO_GOAL", "LAUNCH_GOAL"):
            self.return_to_goal_attempts += 1
            if self.return_to_goal_attempts >= 2:
                # Repeated diversion! User already promised to return to goal and did not!
                # Escalate immediately to Level 4 Focus Lock (Restriction)
                self.focus_lock_until = now + 1200
                self.last_intervention_level = 4
                response_data["status"] = "ESCALATED_LOCK"
                response_data["is_focus_locked"] = True
                response_data["lock_seconds"] = 1200
                response_data["message"] = "Repeated diversion detected after previous return commitment. Focus Lock engaged (Level 4 Restriction active)."
                try:
                    from .behavior_monitor import behavior_monitor
                    behavior_monitor.minimize_current_distracting_window()
                except Exception:
                    pass
            else:
                # First time: Give a STRICT 15-second window to close the tab / switch away
                self.snooze_until = now + 15
                response_data["message"] = f"Teleporting to {target_label or 'goal workspace'}."

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
            self.last_intervention_level = 4
            response_data["lock_seconds"] = 1200
            response_data["message"] = "Focus Lock engaged for 20 minutes (Level 4 Restriction Foundation active)."
            # Invoke v1 Win32 minimization foundation
            try:
                from .behavior_monitor import behavior_monitor
                behavior_monitor.minimize_current_distracting_window()
            except Exception:
                pass

        elif action_id == "SNOOZE_2M":
            # 2-minute snooze (120s)
            self.snooze_until = now + 120
            response_data["status"] = "SNOOZED"
            response_data["message"] = "Intervention snoozed for 2 minutes."

        elif action_id == "DISMISS":
            # Dismissed without action; enforce 30s cooldown
            self.snooze_until = now + 30
            response_data["status"] = "DISMISSED"
            response_data["message"] = "Intervention dismissed."

        return response_data

    def is_focus_locked(self) -> bool:
        """Returns True if the system is currently under an active Level 4 Focus Lock."""
        if self.restrictions_paused:
            return False
        return time.time() < self.focus_lock_until

    def trigger_freeze_punishment(
        self,
        app_or_url: str = "Instagram / Shorts / Texting",
        reason: str = "Excessive digital distraction detected. 1-minute tab freeze penalty enforced.",
        duration_seconds: int = 60
    ) -> Dict[str, Any]:
        """Enforces a strict 1-minute frozen lockout penalty for excess distraction."""
        if self.restrictions_paused:
            return {
                "active": False,
                "paused": True,
                "remaining_seconds": 0,
                "total_seconds": 60,
                "reason": self.restrictions_pause_reason or "Restrictions paused: Guest or no user in front of screen.",
                "target_app": ""
            }

        now = time.time()
        self.freeze_punishment_until = now + duration_seconds
        self.freeze_punishment_reason = reason
        self.freeze_punishment_app = app_or_url
        self.last_intervention_level = 4

        try:
            from .behavior_monitor import behavior_monitor
            behavior_monitor.minimize_current_distracting_window()
        except Exception:
            pass

        return self.get_freeze_punishment_status()

    def is_freeze_punishment_active(self) -> bool:
        """Returns True if the 1-minute frozen lockout punishment is currently running."""
        if self.restrictions_paused:
            return False
        return time.time() < self.freeze_punishment_until

    def get_freeze_punishment_status(self) -> Dict[str, Any]:
        """Returns status and countdown of active freeze punishment."""
        if self.restrictions_paused:
            return {
                "active": False,
                "paused": True,
                "remaining_seconds": 0,
                "total_seconds": 60,
                "reason": self.restrictions_pause_reason or "Restrictions paused for Guest / Away mode.",
                "target_app": ""
            }
        now = time.time()
        is_active = now < self.freeze_punishment_until
        remaining = max(0, int(self.freeze_punishment_until - now)) if is_active else 0
        return {
            "active": is_active,
            "paused": False,
            "remaining_seconds": remaining,
            "total_seconds": 60,
            "reason": self.freeze_punishment_reason if is_active else "",
            "target_app": self.freeze_punishment_app if is_active else ""
        }

    def clear_freeze_punishment(self):
        """Manually clears the freeze punishment."""
        self.freeze_punishment_until = 0
        self.freeze_punishment_reason = ""
        self.freeze_punishment_app = ""


intervention_manager = AdaptiveInterventionManager()
