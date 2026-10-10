# Focus Guard 2.0 — Adaptive Digital Wellbeing Assistant

> **ForgeHacks Submission**  
> *"Don't simply block distraction. Understand it, intervene intelligently, and help the user regain control of their attention."*

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-green.svg)](extension/)
[![Biometrics: OpenCV + SFace](https://img.shields.io/badge/Biometrics-OpenCV_YuNet_%2B_SFace-orange.svg)](tools/face_auth.py)
[![Security: Windows DPAPI](https://img.shields.io/badge/Security-Windows_DPAPI-blueviolet.svg)](tools/face_auth.py)
[![AI Engine: Groq LLM + Deterministic](https://img.shields.io/badge/AI_Engine-Groq_LLM_%2B_Offline_Fallback-teal.svg)](core/ai_recommendation.py)

Focus Guard 2.0 evolves from a rigid, punitive application-blocking tool into an **adaptive, context-aware digital-wellbeing assistant**.  
Its central concept is **Attention Drift**: continuously evaluating the divergence between **User Intention** and **Actual Digital Behavior**.

Instead of immediately punishing users when they visit YouTube or social platforms, Focus Guard 2.0 understands context (e.g., distinguishing a 2-hour Data Structures lecture from 15 minutes of algorithmic Shorts), detects attention drift, offers empathetic AI interventions, and progressively escalates only when distractions persist.

---

## 🔄 Core Adaptive Loop

```
User Intent ➔ Actual Behaviour ➔ Detect Attention Drift ➔ Understand Context ➔ AI Recommendation ➔ Adaptive Intervention ➔ Learn/Personalize
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             USER INTENT SYSTEM                              │
│       Category (Study / Coding / Work) + Target Outcome + Resource URL      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DUAL-SOURCE USAGE MONITORING                             │
│        Live Win32 OS Window Polling  +  Browser Extension MV3 Bridge        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ATTENTION DRIFT DETECTION ENGINE                         │
│       Trajectory Analysis  •  Contextual Classification  •  Switch Velocity │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              EXPLAINABLE DISTRACTION RISK SCORER (0–100%)                   │
│   Duration (40pts) + Divergence (30pts) + Velocity (18pts) + Penalty (20pts)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                AI ADAPTIVE RECOMMENDATION ("MIND MIRROR")                   │
│       Groq LLM (llama-3.3-70b) + Zero-Downtime Deterministic Fallback       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   5-TIER ADAPTIVE ESCALATION HIERARCHY                      │
│ L0: Flow State  ➔  L1: Awareness  ➔  L2: Suggestion  ➔  L3: Breath Reset   │
│                  ➔  L4: Focus Lock / 1-Min Freeze Penalty                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               OUTCOME TRACKING & BEHAVIORAL PERSONALIZATION                 │
│      3-Min Post-Intervention Verification  •  Empirical Action Efficacy     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 💡 The Paradigm Shift (v1 Foundation vs. 2.0 Assistant)

| Dimension | Focus Guard v1 (Punitive Foundation) | Focus Guard 2.0 (Adaptive Assistant) |
| :--- | :--- | :--- |
| **Philosophy** | Punitive binary blocker (*"Block Instagram immediately"*) | Adaptive digital-wellbeing assistant (*"Understand drift & guide recovery"*) |
| **Context Awareness** | Zero context: treats a 2-hour DSA lecture identical to 15s Shorts | Context-aware: educational YouTube lectures remain aligned; algorithmic feeds trigger drift |
| **Intervention Strategy** | Immediate lockout, window minimize, or DOM shield | Progressive 5-tier escalation: *"Suggestion first, restriction as last resort"* |
| **AI Voice / Persona** | Static error alerts or generic block screens | **"Mind Mirror" Inner Conscience**: empathetic self-awareness nudges |
| **Distraction Response** | Hard cutoff with no productive redirection | **"Teleport to Goal Workspace"**: one-click jump back to declared target |
| **Excess Distraction** | Cooldown-based minimization | **1-Minute Tab Freeze Penalty** with live countdown timer and early goal escape |
| **Biometric Security** | Single-user presence check | **Multi-User Biometrics ("Who's Watching")** with profile switching & guest auto-pause |
| **Feedback Loop** | None: ignores whether the block helped the user | **Empirical Outcome Tracking**: 3-minute post-intervention verification & personalization |

> [!NOTE]
> The pre-existing v1 restriction system serves as the foundational **Level 4 enforcement backend**, while all intent tracking, behavior trajectory analysis, attention-drift detection, AI recommendations, context-aware interventions, and personalizations are newly built for Focus Guard 2.0.

---

## ✨ Key 2.0 Features Built for ForgeHacks

### 1. User Intent System
- Before starting a session, users declare what they intend to achieve:
  - Preset categories: **📚 Study / Academics**, **💻 Software & Coding**, **🎯 Deep Work**, **✍️ Writing & Notes**, **💬 Communication**, or **⚡ Custom Goal**.
  - Natural goals such as: *"Prepare for my Data Structures exam"* or *"Complete React state refactor"*.
  - **Smart Target Resource URL Binding**: Automatically binds a productive workspace URL (e.g., Striver DSA Trees YouTube Lecture, LeetCode Problemset, Google Docs, or custom URLs) used for instant productive teleportation.

### 2. Attention Drift Detection Engine
- Continuously evaluates the user's digital trajectory against declared intent:
  - Four progressive drift states: `NOMINAL` ➔ `MILD_DRIFT` ➔ `MODERATE_DRIFT` ➔ `ACUTE_DRIFT`.
  - Distinguishes **micro-checks** (30-second context switches) from **macro-drifts** (sustained rabbit holes).
  - Trajectory memory tracks whether the user is returning to focus or sinking deeper into distraction.

### 3. Contextual Educational Alignment vs. Short-Form Feeds
- **Silent Educational Lecture Support**: Long-form video lectures, course platforms, and research portals are classified as **`ALIGNED`** during study and coding sessions:
  - Supported platforms include YouTube lectures, Coursera, edX, Khan Academy, NPTEL, PhysicsWallah, GeeksforGeeks, LeetCode, Wikipedia, and university portals.
  - Background ambient audio (lo-fi, binaural beats, study music) is recognized as **`NEUTRAL`** focus support.
- **Short-Form Feed Detection**: Algorithmic short-form video feeds (**YouTube Shorts**, **Instagram Reels**, **TikTok**) are immediately flagged as **`ACUTE_MISMATCH`**, regardless of video title.

### 4. Social Chatting & Messaging Interruption Detection
- Dedicated flow-interruption detection for **WhatsApp Web** (`web.whatsapp.com`), **Telegram Web**, **Discord**, and **Messenger** during study or deep work sessions.
- Safeguards cognitive continuity and working memory by actively flagging casual chat interruptions before they derail the session.

### 5. Transparent & Explainable Distraction Risk Score (0–100%)
Focus Guard 2.0 rejects black-box scoring. Every score exposes its exact point breakdown:
- **Duration Points** (time spent off-intent, max 40 pts)
- **Intent Divergence Penalty** (mismatch severity, max 30 pts)
- **Context Switching Velocity** (rapid app thrashing in 5m, max 18 pts)
- **Repetition Penalty** (returning to distraction after warning, max 20 pts)
- **Productive Recovery Credit** (credit applied for returning to focus)

### 6. "Inner Conscience / Mind Mirror" AI Recommendation Engine
- **Empathetic Inner Monologue Persona**: Replaces robotic block banners with nudges that speak as the user's own rational inner voice:
  - *Shorts/Reels*: *"Deep down you know 1 reel turns into 45 minutes of regret. Let's switch right now."*
  - *Social Chatting*: *"Replying right now breaks your flow state. These messages will still be here when you finish."*
- **Hybrid Architecture**:
  - Queries Groq LLM (`llama-3.3-70b`) with a structured output schema.
  - **Deterministic Fallback Engine**: Instant, zero-downtime offline heuristic generator guarantees recommendations even with no internet connection or expired API keys.

### 7. 5-Tier Adaptive Escalation Hierarchy
```
Level 0 (Flow State) ➔ Level 1 (Awareness) ➔ Level 2 (Suggestion) ➔ Level 3 (Breath Reset) ➔ Level 4 (Restriction)
```
- **Level 0 — Normal (Flow State)**: Green ambient indicator; uninterrupted work.
- **Level 1 — In-Page Awareness**: Subtle, floating glassmorphic pill banner at the top of the distracted page (*"Gentle awareness: still on track for DSA?"*).
- **Level 2 — Suggestion**: Actionable "Mind Mirror" recommendation card with immediate recovery pathways.
- **Level 3 — Focus Intervention**: Guided 3-minute interactive breath reset modal with animated expanding/contracting orb and 4s/4s rhythm.
- **Level 4 — Restriction**: Window minimization / DOM shield, applied **only** when earlier suggestions are repeatedly ignored.

### 8. Direct Productive Redirection ("Teleport to Goal Workspace")
- When an intervention appears on a distracting site, users can click **"🚀 Teleport to Goal Workspace"**.
- The browser extension immediately closes the distracting tab (Instagram Reels, YouTube Shorts, WhatsApp Web) and teleports directly to the declared goal workspace (e.g., Striver DSA Trees Lecture, LeetCode, or Google Docs).

### 9. 🥶 1-Minute Tab Freeze Penalty (Excess Distraction Lockout)
- When excessive distractions (Instagram Reels, YouTube Shorts, or unauthorized social chatting) are detected during an active focus session, Focus Guard 2.0 enforces a **60-second in-page tab freeze penalty**:
  - Distracting page interaction is completely locked.
  - Displays a prominent, frozen-glassmorphism countdown overlay (`01:00`).
  - **Escape Hatch**: Users can break out of the penalty early only by clicking **"🚀 Teleport to Goal Workspace"**, redirecting them immediately back to productive work.

### 10. Local Biometric Presence & "Who's Watching" Security
- **Local Face Authentication**: Powered by OpenCV YuNet (face detection) and SFace ONNX (128-d cosine similarity embeddings).
- **Windows DPAPI Security**: Face templates are encrypted using Windows Data Protection API (`CryptProtectData`), tied directly to the Windows user credential store.
- **Multi-User Profile Switching**: Supports distinct profiles (e.g., **Eshan** - Enrolled Owner, **Yogita** - Research profile).
- **Guest Presence Detection**: When an unenrolled guest is detected looking at the screen, focus restrictions automatically pause so the guest is not disrupted.
- **Webcam Scanner Modal**: Includes a real-time in-dashboard camera scanner with facial reticle and landmark liveness verification.

### 11. 100% Silent & Peaceful Visual Interventions
- All jarring audio buzzers and noisy alarms have been eliminated.
- Interventions rely exclusively on non-intrusive, peaceful visual cues: ambient glowing cards, subtle banners, and mindfulness breathing prompts.

### 12. Intervention Outcome Tracking & Empirical Personalization
- Records user action: **Accepted**, **Dismissed**, **Snoozed**, or **Ignored**.
- **3-Minute Post-Intervention Verification**: Automatically checks whether the user returned to their declared goal within 3 minutes of the intervention:
  - `FLOW_PRESERVED`: User maintained strong focus throughout.
  - `PARTIAL_RECOVERY`: Attention drifted but recovered back to goal.
  - `DRIFT_PERSISTED`: Attention drift continued despite intervention.
- **Empirical Personalization**: Learns which interventions yield the highest recovery rate for each user (e.g., prioritizing 3-minute breath resets over text banners if data shows higher compliance).

---

## 🎬 Interactive Test Scenarios & Demo Walkthrough

The web dashboard includes an interactive **Test Scenarios** dropdown controller at the top of the interface, allowing judges and evaluators to test realistic drift scenarios instantly:

| Step | Scenario | Target Activity | Expected Engine Behavior |
| :---: | :--- | :--- | :--- |
| **1** | **📚 Study Lecture** | Striver DSA Trees & Graphs Lecture (YouTube) | `ALIGNED` • 0% Risk (Level 0 - Flow State) • Emerald Glow |
| **2** | **💻 LeetCode / Coding** | `code.exe` (VS Code - LeetCode 102) | `ALIGNED` • 0% Risk (Flow State preserved) |
| **3** | **📱 YouTube Shorts** | `youtube.com/shorts/...` | `ACUTE_MISMATCH` • Risk rises to 30% (Level 1 - Awareness) |
| **4** | **📸 Instagram Reels** | `instagram.com/reels/...` | `ACUTE_MISMATCH` • Risk rises to 60%+ (Level 2 - Suggestion) • AI Mind Mirror prompts |
| **5** | **💬 WhatsApp Chat** | `web.whatsapp.com` | `ACUTE_MISMATCH` • Flow-break flagged • Messaging intervention prompts |
| **6** | **🥶 1-Min Freeze Penalty** | Excess Distraction (Reels / Shorts / Texting) | 1-Minute Tab Freeze enforced • Live 60s countdown timer on tab |
| **—** | **▶ Run 60s Demo Arc** | Automated complete cycle | Runs full progression with live timing and transitions |
| **—** | **↺ Reset to Real Hardware** | Real OS foreground window | Restores live Win32 window polling & extension bridge |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.9+** installed and available in `PATH`
- **Google Chrome**, **Microsoft Edge**, **Brave**, or any Chromium browser (for the browser extension)
- *(Optional)* Webcam for local biometric face presence verification

---

### Method A: One-Click Windows Launcher (Recommended)

Simply double-click:
```powershell
run_focusguard.bat
```
This checks your Python environment, launches the REST control plane, and opens the dashboard in your default browser at `http://127.0.0.1:8000`.

---

### Method B: npm Runner

```bash
# Start the server via package.json scripts
npm start
# or
npm run dev
```

---

### Method C: Manual Python Launch

```powershell
# From the repository root
python ui/server.py 8000
```
Navigate to **[http://localhost:8000](http://localhost:8000)** in your browser.

---

### 🔌 Installing the Browser Extension (Chrome / Edge / Brave)

1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`).
2. Toggle ON **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `extension/` folder inside the FocusGuard repository:
   ```
   FocusGuard2.0/extension/
   ```
5. The Focus Guard 2.0 extension is now active! It will automatically:
   - Relay active page URLs and titles to the local control plane (`http://127.0.0.1:8000`).
   - Render in-page awareness banners, Mind Mirror AI modals, breath reset screens, and 1-minute tab freeze overlays directly over distracting sites.
   - Support one-click **Teleport to Goal Workspace**.

---

## 📡 REST API Reference

Focus Guard 2.0 provides a clean RESTful control plane on port `8000`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v2/telemetry/live` | Ingests live telemetry, evaluates attention drift, calculates 0–100% risk score, checks presence, and returns active intervention. |
| `POST` | `/api/v2/session/start` | Starts an adaptive focus session with intent category, goal text, duration, and target resource URL. |
| `POST` | `/api/v2/session/stop` | Terminates the active focus session. |
| `GET` | `/api/v2/intent` | Retrieves the active intent and preset categories. |
| `POST` | `/api/v2/intent` | Registers or updates the declared user intention. |
| `POST` | `/api/v2/intervention/action` | Handles user response (`BREATH_RESET`, `RETURN_TO_GOAL`, `SHORT_BREAK`, `FOCUS_LOCK`, `DISMISS`, `SNOOZE_2M`). |
| `GET` | `/api/v2/insights` | Retrieves personalization metrics, empirical recovery rates, and recent outcome history. |
| `POST` | `/api/v2/simulator/step` | Ingests a simulated activity step (1–7) for judge evaluations. |
| `POST` | `/api/v2/simulator/reset` | Resets simulator and restores live Win32 OS window polling. |
| `POST` | `/api/v2/punishment/freeze` | Triggers the 1-Minute Tab Freeze penalty for excess distraction. |
| `POST` | `/api/v2/punishment/clear` | Manually lifts the 1-Minute Tab Freeze penalty. |
| `GET` / `POST` | `/api/face/presence` | Checks or simulates biometric presence (`USER_WATCHING`, `GUEST_WATCHING`, `AWAY`). |
| `GET` | `/api/face/users` | Lists registered user profiles and active user. |
| `POST` | `/api/users/switch` | Switches active user profile (e.g., Eshan ⇄ Yogita). |
| `POST` | `/api/goal/evaluate` | Browser extension bridge for real-time URL and DOM evaluation. |
| `GET` | `/api/v2/architecture` | Returns paradigm comparison (v1 binary foundation vs. 2.0 adaptive assistant). |

---

## 🧪 Automated Verification Suite

Verify the complete closed-loop engine directly from PowerShell or Command Prompt:

```powershell
python -c "
from core.intent_engine import create_user_intent, evaluate_activity_against_intent
from core.drift_engine import drift_engine
from core.risk_scorer import risk_scorer
from core.ai_recommendation import ai_engine
from core.adaptive_intervention import intervention_manager
from core.outcome_tracker import outcome_tracker
from core.personalization import personalization_engine

# 1. Create Intent
intent = create_user_intent('study', 'DSA Exam', 25)
print('✓ Intent Engine Verified:', intent['goal_text'], '->', intent['target_label'])

# 2. Evaluate Educational Lecture vs Shorts
_, class_lec, _ = evaluate_activity_against_intent(intent, 'chrome.exe', 'Striver DSA Trees Lecture', 'https://youtube.com/watch?v=123')
_, class_shorts, _ = evaluate_activity_against_intent(intent, 'chrome.exe', 'Viral Shorts', 'https://youtube.com/shorts/123')
print('✓ Contextual YouTube Evaluation: Lecture =', class_lec, '| Shorts =', class_shorts)

# 3. Evaluate Drift & Transparent Risk
drift = drift_engine.evaluate_drift(intent, {'app_name': 'chrome.exe', 'url': 'https://instagram.com/reels'}, [], 5)
risk = risk_scorer.calculate_risk_score(drift)
print('✓ Risk Scorer Verified: Score =', risk['score'], '| Level =', risk['level'])

# 4. Generate AI Mind Mirror Recommendation
rec = ai_engine.generate_recommendation(intent, {'app_name': 'chrome.exe'}, drift, risk)
print('✓ AI Recommendation Engine Verified: Headline =', rec['headline'], '| Engine =', rec['engine_used'])

# 5. Adaptive Intervention & Freeze Penalty
freeze = intervention_manager.trigger_freeze_punishment('instagram.com', 'Test Penalty', 60)
print('✓ 1-Minute Freeze Penalty Verified: Active =', freeze['active'], '| Remaining =', freeze['remaining_seconds'], 's')
"
```

---

## 📂 Project Architecture & Repository Layout

```
FocusGuard2.0/
├── core/                           # Focus Guard 2.0 Core Intelligence Engines
│   ├── intent_engine.py            # User Intent declaration, keyword parsing, smart destinations
│   ├── behavior_monitor.py         # Win32 OS window polling + extension listener + simulator
│   ├── drift_engine.py             # Attention Drift state machine (Nominal -> Acute)
│   ├── risk_scorer.py              # Transparent 0–100% scoring with exact factor breakdown
│   ├── ai_recommendation.py        # Mind Mirror Conscience persona (Groq LLM + offline fallback)
│   ├── adaptive_intervention.py    # 5-Tier escalation, freeze punishment, & goal teleportation
│   ├── outcome_tracker.py          # 3-minute post-intervention recovery verification
│   └── personalization.py          # Empirical intervention action efficacy engine
│
├── extension/                      # Chrome / Edge Manifest V3 Browser Extension
│   ├── manifest.json               # MV3 manifest configuration
│   ├── background.js               # Service worker & tab management (Teleport to Goal)
│   ├── content.js                  # In-page HUD, Mind Mirror modal, breath reset, 1-min freeze
│   ├── popup.html / popup.js       # Extension popup widget with live status & controls
│   └── README.md                   # Dedicated extension setup guide
│
├── ui/                             # Web Control Plane & Dashboard
│   ├── index.html                  # Minimalist glassmorphic dashboard (studio layout)
│   ├── styles.css                  # Custom tokens, dark aesthetic, breathing orb animation
│   ├── app.js                      # Real-time polling, scenario controller, webcam scanner
│   └── server.py                   # REST API server & static asset gateway (port 8000)
│
├── tools/                          # Foundational Security & Biometrics
│   ├── face_auth.py                # Local OpenCV YuNet + SFace ONNX + Windows DPAPI encryption
│   └── llm_provider.py             # Groq LLM API client wrapper with circuit breaker
│
├── docs/                           # Documentation & Build Logs
│   └── BUILD_LOG.md                # Comprehensive ForgeHacks build log & eligibility audit
│
├── run_focusguard.bat              # One-click Windows batch launcher
├── package.json                    # npm runner scripts (npm start / npm run dev)
├── policies.json                   # Foundational binary policy definitions
└── user_profiles.json              # Biometric user profiles (Eshan, Yogita)
```

---

## 📁 Repository & Eligibility Reference

- **Pre-existing functionality** vs. **ForgeHacks additions** are comprehensively documented in [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md).
- Original v1 reference repository: [Codewith-Yogita/FocusGuard](https://github.com/Codewith-Yogita/FocusGuard)
- Focus Guard 2.0 repository: [Codewith-Yogita/FocusGuard-2.0](https://github.com/Codewith-Yogita/FocusGuard-2.0)
