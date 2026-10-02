"""
Focus Guard 2.0 - AI Adaptive Recommendation Engine
Hybrid architecture: Combines structured LLM prompting (Groq) with an instant,
deterministic fallback generator to guarantee 100% uptime and explainable interventions.
"""

import os
import json
import time
from typing import Dict, Any, List, Optional

# Attempt import of foundation Groq LLM provider
try:
    from tools.llm_provider import GroqProvider
    groq_client = GroqProvider()
except Exception:
    groq_client = None


class AIRecommendationEngine:
    """
    Generates context-aware, empathetic, and controlled intervention recommendations.
    Ensures recommendations are bounded to verified wellbeing actions.
    """

    def generate_recommendation(
        self,
        intent: Dict[str, Any],
        current_activity: Dict[str, Any],
        drift_evaluation: Dict[str, Any],
        risk_evaluation: Dict[str, Any],
        user_personalization: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for generating an intervention recommendation.
        Tries online LLM inference; automatically falls back to deterministic rules if offline.
        """
        # If risk is minimal, no intervention needed
        tier_level = risk_evaluation.get("level", 0)
        if tier_level == 0:
            return {
                "needs_intervention": False,
                "tier_level": 0,
                "headline": "In the Zone",
                "message": "Activity is aligned with your declared focus intent.",
                "actions": [],
                "engine_used": "DETERMINISTIC_RULES"
            }

        # Try LLM first if available
        llm_result = None
        if groq_client and getattr(groq_client, "is_configured", lambda: False)() and getattr(getattr(groq_client, "circuit", None), "is_available", lambda: False)():
            try:
                llm_result = self._generate_with_groq(
                    intent=intent,
                    current_activity=current_activity,
                    drift_evaluation=drift_evaluation,
                    risk_evaluation=risk_evaluation,
                    user_personalization=user_personalization
                )
            except Exception:
                llm_result = None

        if llm_result:
            return llm_result

        # Deterministic Rule-Based Fallback
        return self._generate_deterministic_fallback(
            intent=intent,
            current_activity=current_activity,
            drift_evaluation=drift_evaluation,
            risk_evaluation=risk_evaluation,
            user_personalization=user_personalization
        )

    def _generate_with_groq(
        self,
        intent: Dict[str, Any],
        current_activity: Dict[str, Any],
        drift_evaluation: Dict[str, Any],
        risk_evaluation: Dict[str, Any],
        user_personalization: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Calls Groq with strict JSON output format and controlled action schema."""
        goal_text = intent.get("goal_text", "Focus Session")
        category = intent.get("category", "study")
        app_name = current_activity.get("logical_name") or current_activity.get("app_name", "distracting app")
        drift_seconds = drift_evaluation.get("distraction_streak_seconds", 0)
        drift_min = max(1, int(drift_seconds / 60))
        risk_score = risk_evaluation.get("score", 50)
        tier_level = risk_evaluation.get("level", 2)
        trajectory = drift_evaluation.get("trajectory_summary", "")

        best_intervention = ""
        if user_personalization:
            best_intervention = user_personalization.get("most_effective_action", "")

        prompt = f"""You are the Focus Guard 2.0 Digital Wellbeing Assistant.
The user declared an INTENT: "{goal_text}" (Category: {category}).
Current observed activity: "{app_name}" (off-intent for {drift_min} minutes).
Behavior Trajectory: {trajectory}
Distraction Risk Score: {risk_score}% (Escalation Level {tier_level} of 4).
Learned preference: User recovers best with: {best_intervention or 'short reset'}.

Write a calm, non-judgmental, constructive intervention message.
Do NOT be preachy, clinical, or toxic. Keep it under 2 sentences.

Return ONLY a valid JSON object matching this schema:
{{
  "headline": "Short title (under 5 words)",
  "message": "Empathetic, clear observation and gentle nudge",
  "primary_action": "RETURN_TO_GOAL" | "BREATH_RESET" | "SHORT_BREAK" | "FOCUS_LOCK" | "RESTRICT_APP",
  "rationale": "One sentence explaining why this intervention matches the context"
}}
"""
        response_text = groq_client.generate(prompt, max_tokens=150, temperature=0.3)
        if not response_text:
            return None

        # Parse JSON from response
        try:
            clean_json = response_text.strip()
            if clean_json.startswith("```"):
                clean_json = clean_json.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
            parsed = json.loads(clean_json)

            actions = self._build_action_options(tier_level, parsed.get("primary_action", "RETURN_TO_GOAL"), goal_text)
            return {
                "needs_intervention": True,
                "tier_level": tier_level,
                "headline": parsed.get("headline", "Attention Drift Detected"),
                "message": parsed.get("message", f"Looks like you're drifting from '{goal_text}'."),
                "actions": actions,
                "rationale": parsed.get("rationale", "Observed activity diverges from session intent."),
                "engine_used": "GROQ_LLM"
            }
        except Exception:
            return None

    def _generate_deterministic_fallback(
        self,
        intent: Dict[str, Any],
        current_activity: Dict[str, Any],
        drift_evaluation: Dict[str, Any],
        risk_evaluation: Dict[str, Any],
        user_personalization: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Instant, reliable rule-based generator ensuring Focus Guard 2.0
        never fails even with no network or expired API keys.
        """
        tier_level = risk_evaluation.get("level", 2)
        goal_text = intent.get("goal_text", "your goal")
        target_name = current_activity.get("logical_name") or "other content"
        streak_sec = drift_evaluation.get("distraction_streak_seconds", 0)
        streak_min = max(1, int(streak_sec / 60))
        repeated = drift_evaluation.get("repeated_diversion_count", 1)

        # Level 1: Gentle Awareness
        if tier_level == 1:
            headline = "Attention Nudge"
            message = f"You started '{target_name}'. Still on track for '{goal_text}'?"
            primary_action = "RETURN_TO_GOAL"
            rationale = "Early drift detected (under 90s); gentle awareness prompt."

        # Level 2: Suggestion
        elif tier_level == 2:
            headline = "Drifting from Goal"
            message = f"You've spent {streak_min}m on {target_name} during your '{goal_text}' session. A quick reset may help."
            # Check personalization
            if user_personalization and user_personalization.get("most_effective_action") == "BREATH_RESET":
                primary_action = "BREATH_RESET"
            else:
                primary_action = "SHORT_BREAK"
            rationale = "Sustained distraction observed; proactive suggestion offered before restricting."

        # Level 3: Focus Intervention
        elif tier_level == 3:
            headline = "Attention Intervention"
            message = f"Repeated diversion detected ({repeated} times). Take a structured 3-minute breath reset or lock focus to regain momentum."
            primary_action = "BREATH_RESET"
            rationale = "High distraction risk (>75%); active intervention recommended."

        # Level 4: Restriction Escalation
        else:
            headline = "Focus Protection Activated"
            message = f"Significant off-intent activity detected ({streak_min}m). Distracting tabs/apps can be temporarily restricted."
            primary_action = "FOCUS_LOCK"
            rationale = "Acute or repeated drift (>90% risk); escalated to restriction."

        actions = self._build_action_options(tier_level, primary_action, goal_text)

        return {
            "needs_intervention": True,
            "tier_level": tier_level,
            "headline": headline,
            "message": message,
            "actions": actions,
            "rationale": rationale,
            "engine_used": "DETERMINISTIC_RULES"
        }

    def _build_action_options(self, tier_level: int, primary: str, goal_text: str) -> List[Dict[str, Any]]:
        """Constructs safe, actionable buttons for the UI modal."""
        actions = []

        # Return to Goal is always available
        actions.append({
            "id": "RETURN_TO_GOAL",
            "label": f"Return to '{goal_text[:20]}...'",
            "is_primary": primary == "RETURN_TO_GOAL",
            "type": "refocus"
        })

        if tier_level in (1, 2, 3):
            actions.append({
                "id": "BREATH_RESET",
                "label": "3-Min Breath Reset",
                "is_primary": primary == "BREATH_RESET",
                "type": "reset"
            })
            actions.append({
                "id": "SHORT_BREAK",
                "label": "5-Min Planned Break",
                "is_primary": primary == "SHORT_BREAK",
                "type": "break"
            })

        if tier_level in (3, 4):
            actions.append({
                "id": "FOCUS_LOCK",
                "label": "Activate Focus Lock (20m)",
                "is_primary": primary in ("FOCUS_LOCK", "RESTRICT_APP"),
                "type": "lock"
            })

        # Snooze option
        actions.append({
            "id": "SNOOZE_2M",
            "label": "Need 2 more mins",
            "is_primary": False,
            "type": "snooze"
        })

        return actions


ai_engine = AIRecommendationEngine()
