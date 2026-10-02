# Focus Guard 2.0 — ForgeHacks Build Log

## Overview & Product Philosophy
Focus Guard 2.0 evolves from an application restriction/blocking tool into an adaptive digital-wellbeing assistant. Its core tenet is:
> *"Don't simply block distraction. Understand it, intervene intelligently, and help the user regain control of their attention."*

The core feedback loop:
`DETECT` ➔ `UNDERSTAND` ➔ `SUGGEST` ➔ `INTERVENE` ➔ `LEARN`

---

## Pre-existing Functionality (Original Focus Guard)
*The following components were built prior to ForgeHacks and serve as the reference foundation:*

1. **C++17 Background Daemon**: Win32 foreground window inspection, basic UI Automation URL retrieval, window minimization on hard-coded cooldowns.
2. **Local Biometric Security Layer**: OpenCV YuNet + SFace ONNX models for face detection, cosine similarity embeddings, DPAPI hardware-bound template encryption, and fallback PIN verification.
3. **Basic Python REST Server**: Single-threaded/multi-threaded `http.server` wrapper on port 8000/8765 handling user profiles, face auth endpoints, and basic policies.
4. **Binary Allow/Block Policies**: Static JSON policies (`policies.json`) classifying applications/domains strictly as `ALLOW`, `BLOCK`, or `CONTENT_AWARE`.
5. **Initial Browser Extension (MV3)**: Injectable content script for basic in-page alert banners and DOM overlay minimization on restricted domains.
6. **Basic Groq LLM Integration**: Standalone prompt script for natural language goal parsing into static duration and allowed/blocked lists.

---

## Built During ForgeHacks (Focus Guard 2.0)
*The following components are designed and developed specifically for ForgeHacks:*

1. **User Intent System**:
   - Structured intent declaration (Category: Study, Work, Communication, Entertainment, Quick Task, Custom Goal).
   - Fast, natural onboarding with target outcome description and time commitments.
   - Contextual benchmark against which digital activities are continuously evaluated.

2. **Focus Session Architecture**:
   - Real-time session state machine (`IDLE`, `INTENT_DECLARED`, `ACTIVE`, `DRIFT_WARNING`, `INTERVENTION_PENDING`, `FOCUS_LOCKED`, `COMPLETED`).
   - Non-intrusive HUD and ambient status indicators.

3. **Multi-Signal Usage & Behavior Monitoring**:
   - Dual-mode data ingestion: Live system/browser telemetry + Interactive Judge Simulation layer.
   - Signals tracked: Active target duration, rapid app switching frequency, session interruptions, micro vs. macro distractions.

4. **Attention Drift Detection Engine**:
   - Evaluates divergence between declared User Intent and actual digital activity trajectories.
   - Context-aware classification (e.g., educational YouTube lectures remain valid under "Study", while Shorts and Reels trigger drift).
   - Multi-stage drift states (`NOMINAL`, `MILD_DRIFT`, `MODERATE_DRIFT`, `ACUTE_DRIFT`).

5. **Explainable Distraction & Risk Score (0–100%)**:
   - Transparent scoring engine calculating risk from: intent mismatch, duration in mismatch, switching velocity, repetition penalty, and recovery credit.
   - Full human-readable breakdown explaining exactly *why* the score was assessed.

6. **AI Adaptive Recommendation Engine**:
   - Structured context feeding: user intent, session history, drift level, previous intervention responses.
   - Constrained intervention suggestions: gentle refocusing, guided 3-minute breath reset, 5-minute structured break, temporary Focus Lock.
   - Deterministic offline fallback engine ensuring zero downtime when LLM providers are offline.

7. **5-Tier Adaptive Escalation Hierarchy**:
   - Level 0 (Normal) ➔ Level 1 (Awareness) ➔ Level 2 (Suggestion) ➔ Level 3 (Focus Intervention) ➔ Level 4 (Restriction).
   - "Suggestion first, restriction later" progressive intervention model.

8. **Intervention Outcome Tracking**:
   - Monitors user response: Accepted, Dismissed, Snoozed, or Ignored.
   - Post-intervention behavioral verification: Did the user successfully return to their declared intent within 3 minutes?
   - Complete audit trail of intervention efficacy.

9. **Behavioral Personalization & Insights Engine**:
   - Adaptive learning based on empirical response history (e.g., preferring 5-min resets over generic text banners).
   - Visual digital wellbeing insights: Focus recovery rate, top drift triggers, and tailored productivity patterns.

10. **Interactive 60-Second Judge Demo & Scenario Simulator**:
    - One-click verifiable demo simulating the canonical drift arc: Study ➔ YouTube Lecture ➔ YouTube Shorts ➔ Instagram ➔ AI Intervention ➔ Recovery.

---

## Implementation Verification & File Inventory

| Module | Path | Purpose | Verification Status |
| :--- | :--- | :--- | :--- |
| **Intent Engine** | `core/intent_engine.py` | Declares intent, parses goals, extracts keywords, evaluates context | Verified |
| **Behavior Monitor** | `core/behavior_monitor.py` | Real Win32 window polling + extension listener + simulation layer | Verified |
| **Drift Engine** | `core/drift_engine.py` | Multi-stage drift state machine (`NOMINAL` to `ACUTE_DRIFT`) | Verified |
| **Risk Scorer** | `core/risk_scorer.py` | Transparent 0–100% scoring with exact factor point breakdown | Verified |
| **AI Recommendation** | `core/ai_recommendation.py` | Hybrid Groq LLM inference with deterministic fallback | Verified |
| **Adaptive Escalation**| `core/adaptive_intervention.py`| Governs Levels 0–4, cooldowns, snooze, breath reset, and lock | Verified |
| **Outcome Tracker** | `core/outcome_tracker.py` | Empirical logging and 3-minute post-intervention recovery checks | Verified |
| **Personalization** | `core/personalization.py` | Computes action efficacy rates and personalizes future interventions | Verified |
| **REST API Server** | `ui/server.py` | Serves web dashboard and handles all `/api/v2/*` endpoints | Verified (Port 8000) |
| **Web Dashboard** | `ui/index.html` | Minimalist calm UI with ambient focus hero, timer, & demo banner | Verified |
| **Design System** | `ui/styles.css` | Glassmorphic dark aesthetic, breathing orb animation, custom tokens | Verified |
| **App Controller** | `ui/app.js` | Live polling, intervention modals, breath reset, and 60s auto demo | Verified |

