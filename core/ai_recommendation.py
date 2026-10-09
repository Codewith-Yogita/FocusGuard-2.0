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
        """Calls Groq with the 'Inner Conscience / Mind Mirror' persona and controlled schema."""
        goal_text = intent.get("goal_text", "Focus Session")
        category = intent.get("category", "study")
        app_name = current_activity.get("logical_name") or current_activity.get("app_name", "distracting app")
        target_url = intent.get("target_url", "https://leetcode.com/problemset/all/")
        target_label = intent.get("target_label", "Goal Workspace")
        drift_seconds = drift_evaluation.get("distraction_streak_seconds", 0)
        drift_min = max(1, int(drift_seconds / 60))
        risk_score = risk_evaluation.get("score", 50)
        tier_level = risk_evaluation.get("level", 2)
        trajectory = drift_evaluation.get("trajectory_summary", "")

        best_intervention = ""
        if user_personalization:
            best_intervention = user_personalization.get("most_effective_action", "")

        prompt = f"""You are the Focus Guard 2.0 Digital Wellbeing Assistant acting as the USER'S OWN INNER CONSCIENCE / MIND MIRROR.
The user declared an INTENT: "{goal_text}" (Category: {category}).
Productive Target Destination: "{target_label}".
Current observed activity: "{app_name}" (off-intent for {drift_min} minutes).
Behavior Trajectory: {trajectory}
Distraction Risk Score: {risk_score}% (Escalation Level {tier_level} of 4).
Learned preference: User recovers best with: {best_intervention or 'direct goal launch'}.

Humans often know deep down what is good for them, but ignore their own rational thoughts when dopamine grabs them (scrolling reels/shorts, or texting in group chats).
Your job is to speak as their own honest, rational inner voice:
- Point out what they already know deep down (e.g. "You know 1 reel turns into 45m of regret", "These messages can wait 20m, protect your flow").
- Do NOT be a clinical robotic blocker or preachy school teacher. Speak like their own sharp, caring inner mind.
- Keep it punchy (maximum 2 sentences).
- Urge them to teleport straight to {target_label}.

Return ONLY a valid JSON object matching this schema:
{{
  "headline": "Short punchy title (under 5 words)",
  "message": "Direct, empathetic conscience observation urging return to target",
  "primary_action": "RETURN_TO_GOAL" | "BREATH_RESET" | "SHORT_BREAK" | "FOCUS_LOCK",
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

            actions = self._build_action_options(tier_level, parsed.get("primary_action", "RETURN_TO_GOAL"), goal_text, target_url, target_label)
            return {
                "needs_intervention": True,
                "tier_level": tier_level,
                "headline": parsed.get("headline", "Your Mind Mirror: Still on Track?"),
                "message": parsed.get("message", f"You wanted to accomplish '{goal_text}'. Let's switch to {target_label}."),
                "target_url": target_url,
                "target_label": target_label,
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
        Instant, reliable 'Inner Conscience / Mind Mirror' rule-based generator.
        Provides empathetic, honest, and direct reflections tailored to Reels, Shorts, Chatting, and Browsing.
        """
        tier_level = risk_evaluation.get("level", 2)
        goal_text = intent.get("goal_text", "your goal")
        target_name = current_activity.get("logical_name") or "other content"
        url_low = (current_activity.get("url") or "").lower()
        title_low = (current_activity.get("window_title") or "").lower()
        app_low = (current_activity.get("app_name") or "").lower()

        target_url = intent.get("target_url", "https://leetcode.com/problemset/all/")
        target_label = intent.get("target_label", "Goal Workspace")

        streak_sec = drift_evaluation.get("distraction_streak_seconds", 0)
        streak_min = max(1, int(streak_sec / 60))
        repeated = drift_evaluation.get("repeated_diversion_count", 1)

        is_short_form = any(k in url_low or k in title_low for k in ["/shorts", "/reel", "reels", "tiktok", "instagram.com/reels"])
        is_chatting = any(k in url_low or k in title_low for k in ["web.whatsapp.com", "whatsapp", "discord", "web.telegram.org", "telegram", "messenger.com", "instagram.com/direct"]) or any(k in app_low for k in ["whatsapp.exe", "discord.exe", "telegram.exe"])

        # Determine Context-Aware "Mind Mirror" Voice
        if is_short_form:
            if tier_level == 1:
                headline = "Mind Mirror: The 15-Second Trap"
                message = f"Deep down, you know one reel turns into 45 minutes of regret. You set this time to crush '{goal_text}'. Let's switch right now."
                primary_action = "RETURN_TO_GOAL"
                rationale = "Algorithmic short-form video trap detected; prompting conscious reflection."
            elif tier_level in (2, 3):
                headline = "Mind Mirror: That Reel Won't Help You"
                message = f"You've been scrolling {target_name} for {streak_min}m. Watching other people's content won't build your skills for '{goal_text}'. Let's launch {target_label}."
                primary_action = "RETURN_TO_GOAL"
                rationale = "Repeated dopamine feed consumption; urge user to teleport straight to productive resource."
            else:
                headline = "Focus Protection Engaged"
                message = f"Short-form video was dismissed repeatedly. Feed restricted to protect your commitments to '{goal_text}'."
                primary_action = "FOCUS_LOCK"
                rationale = "Acute or repeated short-form feed drift; escalated to restriction."

        elif is_chatting:
            if tier_level == 1:
                headline = "Mind Mirror: Can This Chat Wait?"
                message = f"You know how easy it is to lose 20 minutes replying. These messages will still be here when you finish '{goal_text}'. Protect your momentum."
                primary_action = "RETURN_TO_GOAL"
                rationale = "Casual social messaging detected; context switching fractures deep flow state."
            elif tier_level in (2, 3):
                headline = "Mind Mirror: Protect Your Flow"
                message = f"Chatting right now breaks the train of thought you built for '{goal_text}'. Send a quick 'busy focusing' or jump back into {target_label}."
                primary_action = "RETURN_TO_GOAL"
                rationale = "Active chatting during deep work session; direct nudge to preserve cognitive continuity."
            else:
                headline = "Focus Lock Engaged — Chat Restricted"
                message = f"Social chatting persisted during your focus block for '{goal_text}'. Messaging restricted until session break."
                primary_action = "FOCUS_LOCK"
                rationale = "Persistent chatting divergence escalated to restriction."

        else:
            # General Web Browsing / Entertainment
            if tier_level == 1:
                headline = "Mind Mirror: Still on Track?"
                message = f"You opened {target_name}. Ask yourself: is this moving you closer to '{goal_text}', or just delaying the hard work?"
                primary_action = "RETURN_TO_GOAL"
                rationale = "Early drift detected; prompting self-awareness before habit loop solidifies."
            elif tier_level == 2:
                headline = "Mind Mirror: Remember Why You Started"
                message = f"You've spent {streak_min}m on {target_name}. You chose '{goal_text}' because it matters to you. Let's redirect to {target_label} right now."
                if user_personalization and user_personalization.get("most_effective_action") == "BREATH_RESET":
                    primary_action = "BREATH_RESET"
                else:
                    primary_action = "RETURN_TO_GOAL"
                rationale = "Off-intent browsing detected; constructive suggestion to resume declared goal."
            elif tier_level == 3:
                headline = "Attention Intervention"
                message = f"Repeated diversion detected ({repeated} times). Take a structured 3-minute breath reset or lock focus to regain momentum for '{goal_text}'."
                primary_action = "BREATH_RESET"
                rationale = "High distraction risk (>75%); active intervention recommended."
            else:
                headline = "Focus Protection Activated"
                message = f"Significant off-intent activity detected ({streak_min}m). Distracting tabs/apps can be temporarily restricted."
                primary_action = "FOCUS_LOCK"
                rationale = "Acute or repeated drift (>90% risk); escalated to restriction."

        actions = self._build_action_options(tier_level, primary_action, goal_text, target_url, target_label)

        return {
            "needs_intervention": True,
            "tier_level": tier_level,
            "headline": headline,
            "message": message,
            "target_url": target_url,
            "target_label": target_label,
            "actions": actions,
            "rationale": rationale,
            "engine_used": "DETERMINISTIC_RULES"
        }

    def _build_action_options(
        self,
        tier_level: int,
        primary: str,
        goal_text: str,
        target_url: str = "https://leetcode.com/problemset/all/",
        target_label: str = "Goal Workspace"
    ) -> List[Dict[str, Any]]:
        """Constructs safe, actionable buttons for the UI modal with smart redirection."""
        actions = []

        # Direct Teleport to Goal Resource is the primary action
        actions.append({
            "id": "RETURN_TO_GOAL",
            "label": f"🚀 Launch {target_label} Now",
            "target_url": target_url,
            "target_label": target_label,
            "is_primary": primary == "RETURN_TO_GOAL",
            "type": "teleport"
        })

        if tier_level in (1, 2, 3):
            actions.append({
                "id": "BREATH_RESET",
                "label": "🧘 3-Min Reset (Clear Urge)",
                "is_primary": primary == "BREATH_RESET",
                "type": "reset"
            })
            actions.append({
                "id": "SHORT_BREAK",
                "label": "⏸️ 5-Min Planned Break",
                "is_primary": primary == "SHORT_BREAK",
                "type": "break"
            })

        if tier_level in (3, 4):
            actions.append({
                "id": "FOCUS_LOCK",
                "label": "🔒 Lock Out Distractions (20m)",
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
