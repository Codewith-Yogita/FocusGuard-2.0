"""
Focus Guard 2.0 - Explainable Distraction Risk Scorer
Computes a transparent, tunable 0-100% Distraction Risk Score with full factor breakdown.
"""

from typing import Dict, Any, Tuple


class RiskScorer:
    """
    Transparent heuristic scoring model calculating real-time Distraction Risk.
    Avoids black-box magic by explicitly exposing each contributing factor.
    """

    @staticmethod
    def calculate_risk_score(
        drift_evaluation: Dict[str, Any],
        user_personalization_factor: float = 1.0
    ) -> Dict[str, Any]:
        """
        Calculates Distraction Risk Score (0 - 100%) and returns structured explanation.
        """
        classification = drift_evaluation.get("classification", "NEUTRAL")
        distraction_seconds = drift_evaluation.get("distraction_streak_seconds", 0)
        switches_5m = drift_evaluation.get("switches_last_5m", 0)
        repeated_diversions = drift_evaluation.get("repeated_diversion_count", 0)
        alignment_score = drift_evaluation.get("alignment_score", 0.0)

        # 1. Base Duration Points (0 to 40 pts)
        # Scale: 0s -> 0 pts; 60s -> 15 pts; 180s -> 30 pts; 300s+ -> 40 pts
        duration_pts = 0
        if distraction_seconds > 0:
            if distraction_seconds <= 30:
                duration_pts = int(distraction_seconds * 0.2)  # 0 to 6
            elif distraction_seconds <= 120:
                duration_pts = 6 + int((distraction_seconds - 30) * 0.15)  # 6 to 20
            elif distraction_seconds <= 300:
                duration_pts = 20 + int((distraction_seconds - 120) * 0.1) # 20 to 38
            else:
                duration_pts = 40

        # 2. Intent Mismatch Points (0 to 30 pts)
        # Acute mismatch (e.g. reels/shorts during study) = 30 pts
        # Drift risk (e.g. general entertainment) = 18 pts
        # Neutral = 5 pts
        # Aligned = 0 pts
        mismatch_pts = 0
        if classification == "ACUTE_MISMATCH":
            mismatch_pts = 30
        elif classification == "DRIFT_RISK":
            mismatch_pts = 18
        elif classification == "NEUTRAL":
            mismatch_pts = 4
        elif classification == "ALIGNED":
            mismatch_pts = 0

        # 3. Switching Velocity / Thrashing Points (0 to 18 pts)
        # Frequent context switching indicates restless attention
        # > 3 switches in 5m starts adding points
        switching_pts = 0
        if switches_5m >= 3:
            switching_pts = min(18, (switches_5m - 2) * 4)

        # 4. Repetition Penalty (0 to 35 pts)
        # If user previously drifted and returned to distraction in the same session
        repetition_pts = min(35, max(0, repeated_diversions * 15))

        # 5. Recovery Credit (0 to -25 pts)
        # If user is currently aligned, subtract risk rapidly
        recovery_credit = 0
        if classification == "ALIGNED":
            recovery_credit = -25
            duration_pts = 0
            mismatch_pts = 0
            repetition_pts = 0

        # Raw total before clamp
        raw_score = (duration_pts + mismatch_pts + switching_pts + repetition_pts + recovery_credit)
        # Apply gentle user-specific sensitivity if learned
        adjusted_score = int(raw_score * user_personalization_factor)
        final_score = max(0, min(100, adjusted_score))

        # Determine Escalation Tier (Levels 0 to 4)
        if final_score < 25:
            tier_level = 0
            tier_name = "LEVEL 0 — Normal (Flow State)"
            badge_color = "good"
        elif final_score < 50:
            tier_level = 1
            tier_name = "LEVEL 1 — Awareness"
            badge_color = "info"
        elif final_score < 75:
            tier_level = 2
            tier_name = "LEVEL 2 — Suggestion"
            badge_color = "warning"
        elif final_score < 90:
            tier_level = 3
            tier_name = "LEVEL 3 — Focus Intervention"
            badge_color = "urgent"
        else:
            tier_level = 4
            tier_name = "LEVEL 4 — App Restriction"
            badge_color = "danger"

        # Build Explainable Breakdown String
        reasons = []
        if duration_pts > 0:
            reasons.append(f"{distraction_seconds}s off-intent (+{duration_pts}pts)")
        if mismatch_pts > 0:
            reasons.append(f"Intent divergence (+{mismatch_pts}pts)")
        if switching_pts > 0:
            reasons.append(f"{switches_5m} app switches in 5m (+{switching_pts}pts)")
        if repetition_pts > 0:
            reasons.append(f"Repeated distraction ({repeated_diversions}x) (+{repetition_pts}pts)")
        if recovery_credit < 0:
            reasons.append(f"Aligned productive activity ({recovery_credit}pts)")

        explanation = ", ".join(reasons) if reasons else "Productive workflow aligned with focus intent."

        return {
            "score": final_score,
            "level": tier_level,
            "tier_name": tier_name,
            "badge_color": badge_color,
            "explanation": explanation,
            "breakdown": {
                "duration_points": duration_pts,
                "mismatch_points": mismatch_pts,
                "switching_points": switching_pts,
                "repetition_points": repetition_pts,
                "recovery_credit": recovery_credit
            }
        }


risk_scorer = RiskScorer()
