"""
Focus Guard 2.0 - Attention Drift Engine
Analyzes digital behavior trajectory against user intention over time.
Distinguishes between valid context-aligned deep work and progressive attention drift.
"""

import time
from typing import Dict, Any, List, Optional, Tuple
from .intent_engine import evaluate_activity_against_intent


class DriftState:
    NOMINAL = "NOMINAL"            # Flow state / on-track
    MILD_DRIFT = "MILD_DRIFT"      # Short divergence / early awareness (30s - 2m)
    MODERATE_DRIFT = "MODERATE_DRIFT" # Sustained distraction (2m - 5m)
    ACUTE_DRIFT = "ACUTE_DRIFT"    # High diversion or repeated distraction (> 5m or multiple switches)


class AttentionDriftEngine:
    """
    Evaluates behavioral trajectory over time against the declared user intent.
    Maintains session drift counters, trajectory sequences, and escalation triggers.
    """

    def __init__(self):
        self.session_start_time: Optional[float] = None
        self.drift_start_time: Optional[float] = None
        self.current_drift_state: str = DriftState.NOMINAL
        self.distraction_streak_seconds: int = 0
        self.productive_streak_seconds: int = 0
        self.repeated_diversion_count: int = 0
        self.trajectory_log: List[Dict[str, Any]] = []

    def reset_session(self):
        """Resets drift engine state for a brand-new focus session."""
        self.session_start_time = time.time()
        self.drift_start_time = None
        self.current_drift_state = DriftState.NOMINAL
        self.distraction_streak_seconds = 0
        self.productive_streak_seconds = 0
        self.repeated_diversion_count = 0
        self.trajectory_log.clear()

    def evaluate_drift(
        self,
        intent: Optional[Dict[str, Any]],
        current_activity: Dict[str, Any],
        recent_history: List[Dict[str, Any]],
        switches_last_5m: int
    ) -> Dict[str, Any]:
        """
        Evaluates current drift state based on alignment, duration, and trajectory history.
        """
        now = time.time()
        if not intent:
            return {
                "drift_state": DriftState.NOMINAL,
                "alignment_score": 0.0,
                "classification": "NEUTRAL",
                "reason": "No active intent declared.",
                "distraction_streak_seconds": 0,
                "repeated_diversion_count": 0,
                "trajectory_summary": "No active session."
            }

        app_name = current_activity.get("app_name", "")
        win_title = current_activity.get("window_title", "")
        url = current_activity.get("url")
        activity_duration = int(current_activity.get("duration_seconds", 0))

        # 1. Evaluate single-point alignment
        alignment_score, classification, reason = evaluate_activity_against_intent(
            intent=intent,
            app_name=app_name,
            window_title=win_title,
            url=url
        )

        is_distracted = classification in ("DRIFT_RISK", "ACUTE_MISMATCH")
        is_aligned = classification == "ALIGNED"

        # 2. Update Streaks and State Trajectory
        if is_distracted:
            self.productive_streak_seconds = 0
            if self.drift_start_time is None:
                self.drift_start_time = now - activity_duration
                self.repeated_diversion_count += 1
            self.distraction_streak_seconds = int(now - self.drift_start_time)
        else:
            if is_aligned:
                self.productive_streak_seconds += 5
                # Reset drift start if user has returned to productive focus for > 30 seconds
                if self.productive_streak_seconds >= 30:
                    self.drift_start_time = None
                    self.distraction_streak_seconds = 0
            else:  # NEUTRAL
                # Neutral activities don't instantly reset drift, but pause accumulation
                pass

        # 3. Determine Drift State Level based on duration + context + switching
        streak = self.distraction_streak_seconds

        # Rapid switching penalty (context fragmentation)
        thrashing = switches_last_5m >= 5

        if streak <= 25 and not thrashing and classification != "ACUTE_MISMATCH":
            drift_state = DriftState.NOMINAL
        elif streak < 90 and not thrashing:
            # Under 1.5 minutes of distraction: Early awareness
            drift_state = DriftState.MILD_DRIFT
        elif streak < 240 and self.repeated_diversion_count <= 2:
            # 1.5m to 4m: Moderate drift
            drift_state = DriftState.MODERATE_DRIFT
        else:
            # > 4 minutes or acute mismatch (e.g. reels/shorts during study) or repeated 3+ times
            drift_state = DriftState.ACUTE_DRIFT

        self.current_drift_state = drift_state

        # 4. Build explainable trajectory narrative
        trajectory_summary = self._build_trajectory_narrative(
            intent=intent,
            current_activity=current_activity,
            recent_history=recent_history,
            drift_state=drift_state
        )

        return {
            "drift_state": drift_state,
            "alignment_score": round(alignment_score, 2),
            "classification": classification,
            "reason": reason,
            "distraction_streak_seconds": streak,
            "repeated_diversion_count": self.repeated_diversion_count,
            "switches_last_5m": switches_last_5m,
            "is_context_thrashing": thrashing,
            "trajectory_summary": trajectory_summary
        }

    def _build_trajectory_narrative(
        self,
        intent: Dict[str, Any],
        current_activity: Dict[str, Any],
        recent_history: List[Dict[str, Any]],
        drift_state: str
    ) -> str:
        """Constructs an intuitive trajectory breadcrumb trail for UI and AI context."""
        items = []
        for h in recent_history[-3:]:
            name = h.get("logical_name") or h.get("app_name", "App")
            dur_min = max(1, int(h.get("duration_seconds", 0) / 60))
            items.append(f"{name} ({dur_min}m)")

        curr_name = current_activity.get("logical_name") or current_activity.get("app_name", "App")
        curr_min = max(1, int(current_activity.get("duration_seconds", 0) / 60))
        items.append(f"Now: {curr_name} ({curr_min}m)")

        trajectory = " ➔ ".join(items) if items else curr_name
        return trajectory


drift_engine = AttentionDriftEngine()
