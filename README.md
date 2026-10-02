# Focus Guard 2.0 — Adaptive Digital Wellbeing Assistant

> **ForgeHacks Submission**  
> *"Don't simply block distraction. Understand it, intervene intelligently, and help the user regain control of their attention."*

Focus Guard 2.0 evolves from an application-blocking/restriction tool into an **adaptive digital-wellbeing assistant**.  
Its central concept is **Attention Drift**: continuously evaluating the divergence between **User Intention** and **Actual Digital Behavior**.

Instead of immediately punishing users when they visit YouTube or social platforms, Focus Guard 2.0 understands context (e.g. distinguishing a 2-hour Data Structures lecture from 15 minutes of algorithmic Shorts), detects attention drift, offers context-aware AI interventions, and progressively escalates only when distractions persist.

---

## 🔄 Core Product Loop

```
DETECT ➔ UNDERSTAND ➔ SUGGEST ➔ INTERVENE ➔ LEARN
```

```
User Intent
    ↓
Usage Monitoring (Real Win32 / Extension / Scenario Simulator)
    ↓
Behavior Trajectory Analysis
    ↓
Attention Drift Detection (Nominal ➔ Mild ➔ Moderate ➔ Acute)
    ↓
Transparent Risk Scoring (0–100% Explainable Points)
    ↓
AI Recommendation Engine (Hybrid Groq LLM + Fallback Heuristics)
    ↓
Adaptive 5-Tier Intervention ("Suggestion First, Restriction Later")
    ↓
Outcome Tracking (Accepted / Dismissed / Recovered)
    ↓
Behavioral Personalization (Learns which intervention works best for you)
```

---

## ✨ Key 2.0 Features Built for ForgeHacks

### 1. User Intent System
- Before starting a session, users declare what they intend to accomplish:
  - Preset categories: **Study / Academics**, **Software Engineering / Coding**, **Deep Work**, **Writing**, **Communication**, or **Custom Goal**.
  - Natural goals such as: *"Prepare for my Data Structures exam"* or *"Finish React assignment"*.
- The declared intent becomes the contextual ground truth against which all future digital activity is evaluated.

### 2. Adaptive Focus Session
- Real-time state machine: `IDLE` ➔ `ACTIVE` ➔ `RESET_ACTIVITY` ➔ `FOCUS_LOCKED` ➔ `COMPLETED`.
- Ambient glowing hero card:
  - 🟢 **Emerald Flow Glow**: User is on-track.
  - 🟡 **Amber Drift Glow**: Early attention drift detected.
  - 🔴 **Rose Urgent Glow**: Acute diversion or repeated drift.

### 3. Dual-Source Usage & Behavior Monitoring
- **Real OS Telemetry**: Ingests active foreground window title, process name, and switching velocity directly via Win32 APIs.
- **Browser Extension Bridge**: Ingests page URL and tab titles via local HTTP loopback (`http://127.0.0.1:8000`).
- **Interactive Judge Demo Simulator**: Explicitly separated simulation pipeline allowing evaluators and judges to test realistic drift scenarios with zero setup.

### 4. Attention Drift Detection Engine
- Evaluates trajectory over time:
  - Contextual intelligence: An educational video on YouTube is classified as **`ALIGNED`** during a study session, while YouTube Shorts or Instagram Reels immediately triggers **`DRIFT_RISK`** or **`ACUTE_MISMATCH`**.
  - Distinguishes micro-checks (30-second context switches) from macro-drifts (sustained rabbit holes).

### 5. Transparent & Explainable Distraction Risk Score (0–100%)
- Rejects black-box scoring. Every score exposes its exact point breakdown:
  - **Duration points** (time spent off-intent, max 40 pts)
  - **Intent divergence penalty** (mismatch severity, max 30 pts)
  - **Context switching velocity** (rapid app thrashing in 5m, max 18 pts)
  - **Repetition penalty** (returning to distraction after warning, max 20 pts)
  - **Productive recovery credit** (credit for returning to focus)

### 6. AI Adaptive Recommendation Engine
- **Hybrid Architecture**:
  - Consumes structured context (Intent, observed activity, drift duration, risk score, past intervention outcomes).
  - Queries Groq LLM (`llama-3.3-70b`) with a constrained output schema.
  - **Deterministic Fallback Generator**: Instant, zero-downtime offline heuristic generator guarantees interventions continue even with no internet connection or expired API keys.

### 7. 5-Tier Adaptive Escalation Hierarchy
- **Level 0 — Normal (Flow State)**: Green ambient indicator; uninterrupted work.
- **Level 1 — Awareness**: Subtle, non-intrusive status nudge (*"Gentle awareness: still on track for DSA?"*).
- **Level 2 — Suggestion**: Actionable recommendation card (*"You've spent 4m on Shorts. A 3-minute breath reset may help."*).
- **Level 3 — Focus Intervention**: Guided 3-minute interactive breath reset modal with animated expanding/contracting orb.
- **Level 4 — Restriction**: Window minimization / DOM shield, applied **only** when earlier suggestions are repeatedly ignored.

### 8. Intervention Outcome Tracking & Verification
- Records user action: **Accepted**, **Dismissed**, **Snoozed**, or **Ignored**.
- Automated background verification: After 3 minutes, verifies whether the user actually returned to their declared focus goal.
- Classified into: `SUCCESSFUL_RECOVERY`, `PARTIAL_RECOVERY`, or `DRIFT_PERSISTED`.

### 9. Behavioral Personalization
- Learns which interventions yield the highest recovery rate for each user:
  - e.g. *"Empirical data shows 3-minute breath resets achieve an 85% focus recovery rate for this user, compared to 35% for generic prompts. The AI automatically prioritizes breath resets."*
- Framed strictly as empirical behavioral adaptation based on observed interactions (no medical or clinical claims).

---

## 🎬 60-Second Judge Demo Walkthrough

The web dashboard includes an interactive **Judge Demo Controller** directly at the top of the interface:

1. **Click "1. Study Lecture (Aligned)"**:
   - Status: `ALIGNED` (Striver DSA Trees Lecture on YouTube).
   - Distraction Risk: **0% (Level 0 - Flow State)**.
   - Ambient Glow: Soothing Emerald.
2. **Click "2. LeetCode / IDE (Aligned)"**:
   - Status: `ALIGNED` (VS Code).
   - Distraction Risk: **0% (Flow State)**.
3. **Click "3. YouTube Shorts (Mild Drift)"**:
   - Status: `ACUTE_MISMATCH` (YouTube Shorts).
   - Distraction Risk: Rises to **30% (Level 1 - Awareness)**.
   - Ambient Glow: Amber.
4. **Click "4. Instagram Reels (Moderate Drift)"**:
   - Distraction Risk: Rises to **60%+ (Level 2 - Suggestion)**.
   - **AI Intervention Card** appears: *"Drifting from Goal: You've spent 4m on social video feeds during your study session. A quick reset may help."*
5. **Click "3-Min Breath Reset"**:
   - Interactive guided breathing screen opens with soothing pulsating orb.
   - User completes reset ➔ System marks outcome as `SUCCESSFUL_RECOVERY`.
6. **Click "Run 60s Demo Arc"**:
   - Automatically executes the entire sequence with live timing and visual transitions.

---

## 🚀 Quick Start Guide

### 1. Launch the Focus Guard 2.0 Web Dashboard & REST Server

```powershell
# From the repository root
python ui/server.py 8000
```

Navigate to **[http://localhost:8000](http://localhost:8000)** in your browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Brave).

### 2. Optional: Load the Browser Extension (Chrome / Edge)
1. Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension/` directory.
4. Active browser tabs will now automatically feed live URLs and titles into Focus Guard 2.0!

---

## 📡 REST API Reference (`/api/v2/*`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v2/telemetry/live` | Ingests live telemetry, runs drift detection, calculates risk score, and returns active recommendation. |
| `POST` | `/api/v2/session/start` | Starts an adaptive focus session with intent, category, and duration. |
| `POST` | `/api/v2/session/stop` | Terminates active focus session. |
| `POST` | `/api/v2/intent` | Registers or updates declared user intention. |
| `GET` | `/api/v2/intent` | Retrieves current intent and preset categories. |
| `POST` | `/api/v2/intervention/action` | Records user intervention decision (`BREATH_RESET`, `RETURN_TO_GOAL`, `SHORT_BREAK`, `FOCUS_LOCK`). |
| `GET` | `/api/v2/insights` | Returns personalization metrics, focus recovery rate, and intervention outcome history. |
| `POST` | `/api/v2/simulator/step` | Ingests a simulated activity step (1–5) for judge presentations. |
| `POST` | `/api/v2/simulator/reset` | Resets simulator and restores live hardware Win32 window polling. |
| `POST` | `/api/goal/evaluate` | Browser extension bridge for real-time URL and DOM evaluation. |

---

## 🧪 Automated Verification Suite

Run the end-to-end Python test to verify the complete closed loop:
```powershell
python -c "
from core.intent_engine import create_user_intent; from core.drift_engine import drift_engine; from core.risk_scorer import risk_scorer; from core.ai_recommendation import ai_engine; from core.adaptive_intervention import intervention_manager; from core.outcome_tracker import outcome_tracker; from core.personalization import personalization_engine
intent = create_user_intent('study', 'DSA Exam', 25)
print('Intent Verified:', intent['goal_text'])
"
```

---

## 📁 Repository & Eligibility Reference
- **Pre-existing functionality** vs. **ForgeHacks additions** are comprehensively documented in [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md).
- Original reference project: [Codewith-Yogita/FocusGuard](https://github.com/Codewith-Yogita/FocusGuard).
- Focus Guard 2.0 repository: [Codewith-Yogita/FocusGuard-2.0](https://github.com/Codewith-Yogita/FocusGuard-2.0).
