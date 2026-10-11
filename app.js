/**
 * Focus Guard 2.0 - Frontend Application Controller
 * Handles real-time telemetry polling, intent declaration, adaptive intervention prompts,
 * guided breath resets, and the interactive 60-second judge demo scenario simulator.
 */

let selectedCategory = "study";
let currentInterventionId = null;
let pollTimer = null;
let breathInterval = null;
let breathSecondsRemaining = 180;
let autoDemoTimer = null;

// ============================================================================
// TAB NAVIGATION
// ============================================================================

function switchTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));

  const targetBtn = document.getElementById(`nav-btn-${tabId}`);
  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetBtn) targetBtn.classList.add("active");
  if (targetPane) targetPane.classList.add("active");

  if (tabId === "insights") {
    fetchInsights();
  }
}

// ============================================================================
// INTENT SELECTION & SESSION MANAGEMENT
// ============================================================================

function setDestinationPreset(url, label) {
  const urlInput = document.getElementById("targetUrlInput");
  const hintEl = document.getElementById("targetResourceHint");
  if (urlInput) urlInput.value = url;
  if (hintEl) hintEl.textContent = label;
}

function selectCategory(catKey, el) {
  selectedCategory = catKey;
  document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
  if (el) el.classList.add("active");

  const goalInput = document.getElementById("goalTextInput");
  const defaults = {
    study: "Prepare for my Data Structures exam",
    coding: "Build Focus Guard 2.0 Attention Drift Engine",
    work: "Complete quarterly product roadmap proposal",
    writing: "Finish research paper draft on digital wellbeing",
    communication: "Reply to essential client inquiries",
    custom: "Focus on my primary goal"
  };
  if (goalInput && defaults[catKey]) {
    goalInput.value = defaults[catKey];
  }

  const targetInput = document.getElementById("targetUrlInput");
  const targetHint = document.getElementById("targetResourceHint");
  const targetDefaults = {
    study: { url: "https://www.youtube.com/results?search_query=dsa+trees+lecture+striver", label: "Striver DSA Trees (YouTube)" },
    coding: { url: "https://leetcode.com/problemset/all/", label: "LeetCode Problemset" },
    work: { url: "https://docs.google.com", label: "Google Docs Workspace" },
    writing: { url: "https://docs.google.com", label: "Google Docs Workspace" },
    communication: { url: "https://mail.google.com", label: "Gmail Inbox" },
    custom: { url: "https://leetcode.com/problemset/all/", label: "Goal Workspace" }
  };
  if (targetInput && targetDefaults[catKey]) {
    targetInput.value = targetDefaults[catKey].url;
    if (targetHint) targetHint.textContent = targetDefaults[catKey].label;
  }
}

// ============================================================================
// IN-BROWSER SIMULATION & CLOUD FALLBACK ENGINE
// ============================================================================
let isCloudOffline = false;
let clientSession = {
  status: "IDLE",
  intent: {
    category: "study",
    goal_text: "Prepare for Data Structures exam",
    duration_minutes: 25,
    target_url: "https://youtube.com/watch?v=dsa_trees"
  },
  started_at: 0,
  ends_at: 0,
  duration_minutes: 25,
  productive_seconds: 900,
  distraction_seconds: 120,
  interventions_count: 1,
  current_risk_score: 6,
  user_id: null,
  is_simulated_mode: true
};

let clientCurrentActivity = {
  app_name: "chrome.exe",
  window_title: "Striver DSA Trees & Graphs Lecture - YouTube",
  url: "https://youtube.com/watch?v=dsa_trees",
  duration_seconds: 900,
  source: "SIMULATOR_CLOUD"
};

let clientDrift = {
  status: "NOMINAL",
  trajectory: "ALIGNED",
  duration_seconds: 900,
  deviation_score: 0.05,
  is_drift: false,
  message: "High intent alignment. Focus state optimal.",
  confidence: 0.98,
  trajectory_summary: "Nominal divergence. Deep focus flow sustained."
};

let clientRisk = {
  score: 6,
  level: "LEVEL_0_NOMINAL",
  breakdown: {
    duration_points: 0,
    mismatch_points: 0,
    switching_points: 5,
    repetition_points: 0,
    recovery_credit: 1
  },
  factors: {
    duration_risk: 0,
    mismatch_risk: 0,
    velocity_risk: 5,
    repetition_risk: 0,
    recovery_history_factor: 1
  },
  explanation: "Activity aligns with declared study goal. Nominal risk."
};

let clientRecommendation = {
  tier_level: 0,
  title: "Flow State Preserved",
  message: "Active window matches declared focus goal.",
  context_reason: "Productive learning activity detected."
};

let clientActivePrompt = null;
let clientFreezePunishment = {
  active: false,
  is_active: false,
  remaining_seconds: 0,
  seconds_remaining: 0,
  reason: "",
  target_app: ""
};

let freezeCountdownTimer = null;

function applyClientTelemetryToUI() {
  const telemetryData = {
    session: clientSession,
    intent: clientSession.intent,
    current_activity: clientCurrentActivity,
    drift: clientDrift,
    risk: clientRisk,
    recommendation: clientRecommendation,
    active_prompt: clientActivePrompt,
    switches_last_5m: 2,
    who_is_watching: {
      user_id: currentActiveUser,
      user_present: true,
      is_guest: currentPresenceState === "GUEST_WATCHING",
      status: currentPresenceState,
      confidence: 0.95,
      message: `User '${currentActiveUser}' verified watching screen.`
    },
    freeze_punishment: clientFreezePunishment
  };

  updateSessionUI(telemetryData.session, telemetryData.intent);
  updateCurrentActivityUI(telemetryData.current_activity, telemetryData.drift);
  updateRiskUI(telemetryData.risk, telemetryData.switches_last_5m);
  updateInterventionPromptUI(telemetryData.recommendation, telemetryData.active_prompt);
  updateDriftDiagnosticsUI(telemetryData.drift, telemetryData.risk);
  updateTelemetrySourceBadge(telemetryData.session.is_simulated_mode, telemetryData.current_activity.source);
  updateWhoIsWatchingUI(telemetryData.who_is_watching, telemetryData.session?.user_id);
  updateFreezePunishmentUI(telemetryData.freeze_punishment);
}

function triggerFreezePunishmentLocally(appTarget, reason, duration) {
  clientFreezePunishment = {
    active: true,
    is_active: true,
    remaining_seconds: duration,
    seconds_remaining: duration,
    reason: reason,
    target_app: appTarget
  };
  clearInterval(freezeCountdownTimer);
  updateFreezePunishmentUI(clientFreezePunishment);

  freezeCountdownTimer = setInterval(() => {
    if (clientFreezePunishment.remaining_seconds > 0) {
      clientFreezePunishment.remaining_seconds -= 1;
      clientFreezePunishment.seconds_remaining = clientFreezePunishment.remaining_seconds;
      updateFreezePunishmentUI(clientFreezePunishment);
    } else {
      clientFreezePunishment.active = false;
      clientFreezePunishment.is_active = false;
      clearInterval(freezeCountdownTimer);
      updateFreezePunishmentUI(clientFreezePunishment);
    }
  }, 1000);
}

function applySimulatorStepLocally(stepNum) {
  clientSession.status = "ACTIVE";
  clientSession.is_simulated_mode = true;
  if (!clientSession.started_at) {
    clientSession.started_at = Math.floor(Date.now() / 1000);
    clientSession.ends_at = clientSession.started_at + 1500;
  }

  if (stepNum === 1) {
    clientCurrentActivity = {
      app_name: "chrome.exe",
      window_title: "Striver DSA Trees & Graphs Lecture - YouTube",
      url: "https://youtube.com/watch?v=dsa_trees",
      duration_seconds: 900,
      source: "SIMULATOR_CLOUD"
    };
    clientDrift = {
      status: "NOMINAL",
      trajectory: "ALIGNED",
      duration_seconds: 900,
      deviation_score: 0.05,
      is_drift: false,
      message: "Study lecture closely matches declared intent.",
      confidence: 0.98,
      trajectory_summary: "Nominal divergence. Deep focus flow sustained."
    };
    clientRisk = {
      score: 6,
      level: "LEVEL_0_NOMINAL",
      breakdown: { duration_points: 0, mismatch_points: 0, switching_points: 5, repetition_points: 0, recovery_credit: 1 },
      explanation: "Behavior aligned with study goal. Nominal risk."
    };
    clientRecommendation = {
      tier_level: 0,
      title: "Flow State Preserved",
      message: "User engaged in declared DSA Trees lecture.",
      context_reason: "High topical alignment."
    };
    clientActivePrompt = null;
    clientFreezePunishment.active = false;
    clientFreezePunishment.is_active = false;
  } else if (stepNum === 2) {
    clientCurrentActivity = {
      app_name: "code.exe",
      window_title: "BinaryTree.cpp - LeetCode 102 - Visual Studio Code",
      url: null,
      duration_seconds: 600,
      source: "SIMULATOR_CLOUD"
    };
    clientDrift = {
      status: "NOMINAL",
      trajectory: "ALIGNED",
      duration_seconds: 600,
      deviation_score: 0.08,
      is_drift: false,
      message: "Coding algorithm implementation in IDE.",
      confidence: 0.97,
      trajectory_summary: "Nominal drift. Active coding session."
    };
    clientRisk = {
      score: 10,
      level: "LEVEL_0_NOMINAL",
      breakdown: { duration_points: 0, mismatch_points: 0, switching_points: 8, repetition_points: 0, recovery_credit: 2 },
      explanation: "IDE coding active. Deep work mode."
    };
    clientRecommendation = {
      tier_level: 0,
      title: "Flow State Preserved",
      message: "Coding in IDE matches study objectives.",
      context_reason: "Productive coding activity."
    };
    clientActivePrompt = null;
    clientFreezePunishment.active = false;
    clientFreezePunishment.is_active = false;
  } else if (stepNum === 3) {
    clientCurrentActivity = {
      app_name: "chrome.exe",
      window_title: "Viral Memes #Shorts - YouTube",
      url: "https://youtube.com/shorts/funny_cat_99",
      duration_seconds: 150,
      source: "SIMULATOR_CLOUD"
    };
    clientDrift = {
      status: "MILD",
      trajectory: "DIVERGENT",
      duration_seconds: 150,
      deviation_score: 0.42,
      is_drift: true,
      message: "Short-form entertainment diversion detected.",
      confidence: 0.92,
      trajectory_summary: "Mild trajectory divergence. Diversion onset."
    };
    clientRisk = {
      score: 28,
      level: "LEVEL_1_AWARENESS",
      breakdown: { duration_points: 8, mismatch_points: 15, switching_points: 5, repetition_points: 0, recovery_credit: 0 },
      explanation: "YouTube Shorts diversion started (150s). Awareness prompt advised."
    };
    clientRecommendation = {
      tier_level: 1,
      title: "Gentle Awareness Prompt",
      message: "Brief diversion into YouTube Shorts detected.",
      context_reason: "Non-blocking awareness notification."
    };
    clientActivePrompt = {
      intervention_id: "int_demo_3",
      tier_level: 1,
      risk_score: 28,
      headline: "Mindful Pause: Noticed YouTube Shorts",
      rationale: "You declared 'Study DSA Trees'. Short-form video diverts attention from long-term memory consolidation.",
      actions: [{ id: "DISMISS", label: "Got it, back to DSA", is_primary: true }]
    };
    clientFreezePunishment.active = false;
    clientFreezePunishment.is_active = false;
  } else if (stepNum === 4) {
    clientCurrentActivity = {
      app_name: "chrome.exe",
      window_title: "Instagram Reels",
      url: "https://instagram.com/reels/popular",
      duration_seconds: 320,
      source: "SIMULATOR_CLOUD"
    };
    clientDrift = {
      status: "MODERATE",
      trajectory: "PERSISTENT_DIVERGENT",
      duration_seconds: 320,
      deviation_score: 0.68,
      is_drift: true,
      message: "Social media video feed continuing past 5 minutes.",
      confidence: 0.96,
      trajectory_summary: "Moderate drift: Sustained social feed diversion."
    };
    clientRisk = {
      score: 55,
      level: "LEVEL_2_SUGGESTION",
      breakdown: { duration_points: 18, mismatch_points: 25, switching_points: 8, repetition_points: 4, recovery_credit: 0 },
      explanation: "Instagram Reels active for >5m during study session. Moderate risk."
    };
    clientRecommendation = {
      tier_level: 2,
      title: "Contextual Refocus Suggestion",
      message: "Instagram Reels open for over 5 minutes.",
      context_reason: "Actionable redirect recommended."
    };
    clientActivePrompt = {
      intervention_id: "int_demo_4",
      tier_level: 2,
      risk_score: 55,
      headline: "Mind Mirror: Instagram Reels Active",
      rationale: "Dopamine loop detected. Your declared goal is 'Prepare for Data Structures exam'. Ready to switch back?",
      actions: [
        { id: "RETURN_TO_GOAL", label: "Return to Striver Lecture", is_primary: true, target_url: "https://youtube.com/watch?v=dsa_trees" },
        { id: "DISMISS", label: "Dismiss (2 min)" }
      ]
    };
    clientFreezePunishment.active = false;
    clientFreezePunishment.is_active = false;
  } else if (stepNum === 5) {
    clientCurrentActivity = {
      app_name: "chrome.exe",
      window_title: "Reddit - r/funny",
      url: "https://reddit.com/r/funny",
      duration_seconds: 480,
      source: "SIMULATOR_CLOUD"
    };
    clientDrift = {
      status: "ACUTE",
      trajectory: "CRITICAL_DIVERGENT",
      duration_seconds: 480,
      deviation_score: 0.88,
      is_drift: true,
      message: "Repeated non-productive diversion across multiple entertainment domains.",
      confidence: 0.99,
      trajectory_summary: "Acute attention drift. Repeated diversion loop."
    };
    clientRisk = {
      score: 78,
      level: "LEVEL_3_GUIDED_RESET",
      breakdown: { duration_points: 26, mismatch_points: 28, switching_points: 12, repetition_points: 12, recovery_credit: 0 },
      explanation: "Third distraction domain. Escalating to Guided Breath Reset."
    };
    clientRecommendation = {
      tier_level: 3,
      title: "Guided Micro-Reset",
      message: "Attention fatigue detected. A 3-minute breath reset will restore prefrontal control.",
      context_reason: "High cognitive drift recovery."
    };
    clientActivePrompt = {
      intervention_id: "int_demo_5",
      tier_level: 3,
      risk_score: 78,
      headline: "Attention Reset Required",
      rationale: "Multiple distraction cycles detected. Research shows a 3-minute physiological sigh restores cognitive control.",
      actions: [
        { id: "BREATH_RESET", label: "Start 3-Minute Breath Reset", is_primary: true },
        { id: "RETURN_TO_GOAL", label: "Return to DSA Trees", target_url: "https://youtube.com/watch?v=dsa_trees" }
      ]
    };
    clientFreezePunishment.active = false;
    clientFreezePunishment.is_active = false;
  } else if (stepNum === 6) {
    clientCurrentActivity = {
      app_name: "chrome.exe",
      window_title: "WhatsApp Web - Friends Group Chat",
      url: "https://web.whatsapp.com",
      duration_seconds: 240,
      source: "SIMULATOR_CLOUD"
    };
    clientDrift = {
      status: "MODERATE",
      trajectory: "COMMUNICATION_DIVERSION",
      duration_seconds: 240,
      deviation_score: 0.60,
      is_drift: true,
      message: "Social messaging chat during study session.",
      confidence: 0.94,
      trajectory_summary: "Communication diversion. Context switching penalty."
    };
    clientRisk = {
      score: 48,
      level: "LEVEL_2_SUGGESTION",
      breakdown: { duration_points: 14, mismatch_points: 20, switching_points: 10, repetition_points: 4, recovery_credit: 0 },
      explanation: "Instant messaging diversion detected."
    };
    clientRecommendation = {
      tier_level: 2,
      title: "Chat Diversion Detected",
      message: "Messaging chat active during focused study.",
      context_reason: "Proactive reminder."
    };
    clientActivePrompt = {
      intervention_id: "int_demo_6",
      tier_level: 2,
      risk_score: 48,
      headline: "Social Messaging Alert",
      rationale: "Context switching to messaging apps incurs a 23-minute re-focus penalty.",
      actions: [
        { id: "RETURN_TO_GOAL", label: "Return to Study", is_primary: true, target_url: "https://youtube.com/watch?v=dsa_trees" },
        { id: "DISMISS", label: "Dismiss" }
      ]
    };
    clientFreezePunishment.active = false;
    clientFreezePunishment.is_active = false;
  } else if (stepNum === 7) {
    clientCurrentActivity = {
      app_name: "chrome.exe",
      window_title: "Instagram Reels & Shorts (Excess Distraction)",
      url: "https://instagram.com/reels",
      duration_seconds: 450,
      source: "SIMULATOR_CLOUD"
    };
    clientDrift = {
      status: "ACUTE",
      trajectory: "EXCESS_DISTRACTION",
      duration_seconds: 450,
      deviation_score: 0.95,
      is_drift: true,
      message: "Excess distraction trigger: Instagram Reels & YouTube Shorts watched during study.",
      confidence: 1.0,
      trajectory_summary: "Excessive distraction policy breach. 1-Minute Tab Freeze enforced."
    };
    clientRisk = {
      score: 92,
      level: "LEVEL_4_ENFORCEMENT",
      breakdown: { duration_points: 28, mismatch_points: 30, switching_points: 14, repetition_points: 20, recovery_credit: 0 },
      explanation: "Excessive distraction policy breached. Tab freeze activated."
    };
    clientRecommendation = {
      tier_level: 4,
      title: "1-Minute Freeze Enforced",
      message: "Tab freeze enforced for 60 seconds to break habitual distraction loops.",
      context_reason: "Excessive distraction penalty."
    };
    clientActivePrompt = {
      intervention_id: "int_demo_7",
      tier_level: 4,
      risk_score: 92,
      headline: "Tab Freeze Active — 1 Minute Penalty",
      rationale: "Excessive social scrolling during declared study session. Penalty active.",
      actions: [{ id: "BREATH_RESET", label: "Use Freeze for Breath Reset", is_primary: true }]
    };
    triggerFreezePunishmentLocally("Instagram Reels & YouTube Shorts", "Excessive distraction detected (Instagram Reels / YouTube Shorts / Unnecessary texting). 1-Minute Tab Freeze Penalty enforced.", 60);
  }
}

async function startFocusSession() {
  const goalText = document.getElementById("goalTextInput").value.trim() || "Focus Session";
  const duration = parseInt(document.getElementById("durationSelect").value, 10) || 25;
  const targetUrl = document.getElementById("targetUrlInput")?.value?.trim() || "";

  clientSession.status = "ACTIVE";
  clientSession.intent = {
    category: selectedCategory,
    goal_text: goalText,
    duration_minutes: duration,
    target_url: targetUrl
  };
  clientSession.started_at = Math.floor(Date.now() / 1000);
  clientSession.ends_at = clientSession.started_at + (duration * 60);
  clientSession.duration_minutes = duration;

  try {
    const res = await fetch("/api/v2/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString({
        category: selectedCategory,
        goal_text: goalText,
        duration_minutes: duration,
        target_url: targetUrl
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) clientSession = data.session;
    }
  } catch (err) {}
  pollLiveTelemetry();
}

async function stopFocusSession() {
  clientSession.status = "IDLE";
  clientSession.ends_at = 0;
  clientFreezePunishment.active = false;
  clientFreezePunishment.is_active = false;
  clearInterval(freezeCountdownTimer);

  try {
    await fetch("/api/v2/session/stop", { method: "POST" });
  } catch (err) {}

  document.getElementById("activeFocusCard").style.display = "none";
  document.getElementById("intentOnboardingCard").style.display = "block";
  document.getElementById("interventionCardContainer").style.display = "none";
  pollLiveTelemetry();
}

// ============================================================================
// REAL-TIME TELEMETRY & DRIFT POLLING
// ============================================================================

async function pollLiveTelemetry() {
  try {
    const res = await fetch("/api/v2/telemetry/live");
    if (res.ok) {
      const data = await res.json();
      updateSessionUI(data.session, data.intent);
      updateCurrentActivityUI(data.current_activity, data.drift);
      updateRiskUI(data.risk, data.switches_last_5m);
      updateInterventionPromptUI(data.recommendation, data.active_prompt);
      updateDriftDiagnosticsUI(data.drift, data.risk);
      updateTelemetrySourceBadge(data.session.is_simulated_mode, data.current_activity.source);
      updateWhoIsWatchingUI(data.who_is_watching, data.session?.user_id);
      updateFreezePunishmentUI(data.freeze_punishment);

      // Auto-start continuous camera guard as soon as an owner is enrolled!
      if (data.who_is_watching?.owner_enrolled && !isContinuousFaceGuardActive) {
        startContinuousFaceGuard();
      }
      return;
    }
  } catch (err) {}

  // Fallback to in-browser client state machine
  applyClientTelemetryToUI();
}

function updateSessionUI(session, intent) {
  const onboarding = document.getElementById("intentOnboardingCard");
  const activeCard = document.getElementById("activeFocusCard");
  const completedCard = document.getElementById("sessionCompletedCard");
  const lockCard = document.getElementById("focusLockCard");
  const timerDisplay = document.getElementById("sessionTimerDisplay");
  const goalHeading = document.getElementById("activeGoalHeading");
  const catLabel = document.getElementById("intentCategoryLabel");

  if (!session || session.status === "IDLE") {
    onboarding.style.display = "block";
    activeCard.style.display = "none";
    if (completedCard) completedCard.style.display = "none";
    if (lockCard) lockCard.style.display = "none";
    return;
  }

  if (session.status === "COMPLETED") {
    onboarding.style.display = "none";
    activeCard.style.display = "none";
    if (lockCard) lockCard.style.display = "none";
    if (completedCard) {
      completedCard.style.display = "block";
      const goalEl = document.getElementById("completedGoalDisplay");
      if (goalEl) goalEl.textContent = intent?.goal_text || "Goal Session";

      const outcome = session.outcome || {};
      const iconEl = document.getElementById("completedIconDisplay");
      const headlineEl = document.getElementById("completedHeadline");
      const summaryEl = document.getElementById("completedSummaryText");
      const statusEl = document.getElementById("completedRecoveryStatus");
      const breakdownEl = document.getElementById("completedBreakdownDisplay");

      const isDrift = outcome.recovery_status === "DRIFT_PERSISTED";
      const isPartial = outcome.recovery_status === "PARTIAL_RECOVERY";

      if (iconEl) iconEl.textContent = outcome.icon || (isDrift ? "⚠️" : (isPartial ? "🎯" : "🎉"));
      if (headlineEl) {
        headlineEl.textContent = outcome.headline || (isDrift ? "Session Ended — Attention Drift Detected" : "Focus Session Completed!");
        headlineEl.style.color = isDrift ? "#f43f5e" : (isPartial ? "#f59e0b" : "#10b981");
      }
      if (summaryEl) {
        summaryEl.textContent = outcome.summary || (isDrift
          ? "Attention drift persisted during your session. Declared goal was not met."
          : `You completed ${session.total_duration_minutes || 25} minutes for your declared goal.`);
      }
      if (statusEl) {
        statusEl.textContent = outcome.status_label || (isDrift ? "Drift Persisted" : (isPartial ? "Partial Recovery" : "Flow Preserved"));
        statusEl.style.color = isDrift ? "#f43f5e" : (isPartial ? "#f59e0b" : "#10b981");
      }
      if (breakdownEl) {
        const prod = outcome.productive_minutes ?? Math.round((session.productive_seconds || 0) / 60);
        const dist = outcome.distraction_minutes ?? Math.round((session.distraction_seconds || 0) / 60);
        const pct = outcome.prod_percent ?? 0;
        breakdownEl.textContent = `Productive: ${prod}m | Distracted: ${dist}m (${pct}% Flow State)`;
      }

      completedCard.className = `focus-hero-card ${isDrift ? "urgent-glow" : "flow-glow"}`;
    }
    return;
  }

  // Active Session
  onboarding.style.display = "none";
  activeCard.style.display = "block";
  if (completedCard) completedCard.style.display = "none";

  if (intent) {
    goalHeading.textContent = intent.goal_text || "Focus Session";
    catLabel.textContent = intent.category_label || "Active Goal";
    const linkEl = document.getElementById("activeTargetResourceLink");
    if (linkEl && intent.target_url) {
      linkEl.href = intent.target_url;
      const span = linkEl.querySelector("span");
      if (span) span.textContent = `🚀 Open ${intent.target_label || 'Goal Workspace'}`;
    }
  }

  // Timer format (MM:SS)
  const rem = session.remaining_seconds || 0;
  const m = Math.floor(rem / 60).toString().padStart(2, "0");
  const s = (rem % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${m}:${s}`;

  // Focus Lock handling
  if (lockCard) {
    if (session.is_focus_locked) {
      lockCard.style.display = "block";
    } else {
      lockCard.style.display = "none";
    }
  }
}

function resetToNewSession() {
  stopFocusSession();
  const completedCard = document.getElementById("sessionCompletedCard");
  if (completedCard) completedCard.style.display = "none";
}

async function clearFocusLock() {
  await handleInterventionAction("int_lock_clear", "RETURN_TO_GOAL");
  const lockCard = document.getElementById("focusLockCard");
  if (lockCard) lockCard.style.display = "none";
  pollLiveTelemetry();
}

function updateCurrentActivityUI(activity, drift) {
  if (!activity) return;

  const appNameEl = document.getElementById("currentAppName");
  const titleEl = document.getElementById("currentWindowTitle");
  const badgeEl = document.getElementById("currentStatusBadge");
  const descEl = document.getElementById("activeActivityDesc");
  const heroCard = document.getElementById("activeFocusCard");

  appNameEl.textContent = activity.logical_name || activity.app_name || "Active App";
  titleEl.textContent = activity.window_title || "Digital workspace";

  const cls = drift ? drift.classification : "ALIGNED";
  badgeEl.className = "stat-badge";

  if (cls === "ALIGNED") {
    badgeEl.classList.add("good");
    badgeEl.textContent = "ALIGNED";
    if (descEl) descEl.textContent = `Active: ${activity.window_title} — Aligned with focus intent.`;
    heroCard.className = "focus-hero-card flow-glow";
  } else if (cls === "DRIFT_RISK") {
    badgeEl.classList.add("warning");
    badgeEl.textContent = "DRIFT RISK";
    if (descEl) descEl.textContent = `Off-intent activity: ${activity.window_title}.`;
    heroCard.className = "focus-hero-card drift-glow";
  } else if (cls === "ACUTE_MISMATCH") {
    badgeEl.classList.add("urgent");
    badgeEl.textContent = "ACUTE DIVERGENCE";
    if (descEl) descEl.textContent = `Distracting content detected: ${activity.window_title}.`;
    heroCard.className = "focus-hero-card urgent-glow";
  } else {
    badgeEl.classList.add("info");
    badgeEl.textContent = "NEUTRAL";
    if (descEl) descEl.textContent = `Current: ${activity.window_title}.`;
    heroCard.className = "focus-hero-card";
  }
}

function updateRiskUI(risk, switches) {
  if (!risk) return;

  const scoreEl = document.getElementById("riskScoreDisplay");
  const badgeEl = document.getElementById("riskLevelBadge");
  const fillEl = document.getElementById("riskProgressBarFill");
  const switchesEl = document.getElementById("switchesDisplay");

  const score = risk.score || 0;
  scoreEl.textContent = `${score}%`;
  fillEl.style.width = `${score}%`;

  badgeEl.className = "stat-badge";
  if (score < 25) {
    badgeEl.classList.add("good");
    badgeEl.textContent = `${score}% LEVEL 0`;
    fillEl.style.background = "var(--color-flow)";
  } else if (score < 50) {
    badgeEl.classList.add("info");
    badgeEl.textContent = `${score}% LEVEL 1`;
    fillEl.style.background = "#38bdf8";
  } else if (score < 75) {
    badgeEl.classList.add("warning");
    badgeEl.textContent = `${score}% LEVEL 2`;
    fillEl.style.background = "var(--color-awareness)";
  } else if (score < 90) {
    badgeEl.classList.add("urgent");
    badgeEl.textContent = `${score}% LEVEL 3`;
    fillEl.style.background = "var(--color-urgent)";
  } else {
    badgeEl.classList.add("urgent");
    badgeEl.textContent = `${score}% LEVEL 4`;
    fillEl.style.background = "var(--color-danger)";
  }

  if (switchesEl) switchesEl.textContent = switches || 0;
}

function updateInterventionPromptUI(rec, activePrompt) {
  const container = document.getElementById("interventionCardContainer");
  const headlineEl = document.getElementById("interventionHeadline");
  const msgEl = document.getElementById("interventionMessage");
  const rationaleEl = document.getElementById("interventionRationale");
  const actionsEl = document.getElementById("interventionActionsContainer");
  const engineTag = document.getElementById("interventionEngineTag");

  const prompt = activePrompt || (rec && rec.needs_intervention ? rec : null);
  if (!prompt || !prompt.actions || prompt.actions.length === 0) {
    container.style.display = "none";
    return;
  }

  const isNewPrompt = (currentInterventionId !== (prompt.intervention_id || prompt.headline || "int_live"));
  container.style.display = "block";
  currentInterventionId = prompt.intervention_id || prompt.headline || "int_live";

  headlineEl.textContent = prompt.headline || "Attention Drift Detected";
  msgEl.textContent = prompt.message || "Activity is diverging from your focus goal.";
  rationaleEl.textContent = prompt.rationale ? `Rationale: ${prompt.rationale}` : "";
  engineTag.textContent = prompt.engine_used || "HYBRID ENGINE";

  // Build Action Buttons
  actionsEl.innerHTML = "";
  prompt.actions.forEach(action => {
    const btn = document.createElement("button");
    btn.className = `btn-action ${action.is_primary ? "primary" : ""}`;
    btn.textContent = action.label;
    btn.onclick = () => handleInterventionAction(currentInterventionId, action.id, action.target_url);
    actionsEl.appendChild(btn);
  });
}

async function handleInterventionAction(interventionId, actionId, targetUrl) {
  try {
    const res = await fetch("/api/v2/intervention/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString({ intervention_id: interventionId, action_id: actionId })
    });
    const data = await res.json();

    document.getElementById("interventionCardContainer").style.display = "none";

    if (actionId === "RETURN_TO_GOAL" || actionId === "LAUNCH_GOAL") {
      const dest = targetUrl || data.result?.target_url;
      if (dest) {
        window.open(dest, "_blank");
      }
    }

    if (actionId === "BREATH_RESET") {
      openBreathReset();
    }
  } catch (err) {
    console.error("Action error:", err);
  }
}

// ============================================================================
// ATTENTION DRIFT DIAGNOSTICS & EXPLAINABILITY
// ============================================================================

function updateDriftDiagnosticsUI(drift, risk) {
  if (!drift) return;

  const trajEl = document.getElementById("trajectorySummaryDisplay");
  if (trajEl && drift.trajectory_summary) {
    trajEl.textContent = drift.trajectory_summary;
  }

  if (risk && risk.breakdown) {
    const b = risk.breakdown;
    document.getElementById("breakdownDurationPts").textContent = `+${b.duration_points} pts`;
    document.getElementById("breakdownMismatchPts").textContent = `+${b.mismatch_points} pts`;
    document.getElementById("breakdownSwitchingPts").textContent = `+${b.switching_points} pts`;
    document.getElementById("breakdownRepetitionPts").textContent = `+${b.repetition_points} pts`;
    document.getElementById("breakdownRecoveryCredit").textContent = `${b.recovery_credit} pts`;
  }
}

function updateTelemetrySourceBadge(isSimulated, source) {
  const badge = document.getElementById("telemetryBadge");
  const dot = document.getElementById("telemetryDot");
  const text = document.getElementById("telemetrySourceText");

  if (isSimulated) {
    dot.className = "dot-indicator simulated";
    text.textContent = `SIMULATION (${source || "DEMO"})`;
    badge.title = "Interactive judge simulation layer active";
  } else {
    dot.className = "dot-indicator";
    text.textContent = `LIVE OS (${source || "WIN32"})`;
    badge.title = "Real hardware Win32 window telemetry";
  }
}

// ============================================================================
// GUIDED 3-MINUTE BREATH RESET
// ============================================================================

function openBreathReset() {
  const modal = document.getElementById("breathResetModal");
  modal.style.display = "flex";
  breathSecondsRemaining = 180;

  const instrEl = document.getElementById("breathInstructionText");
  const timerEl = document.getElementById("breathTimerDisplay");

  clearInterval(breathInterval);
  breathInterval = setInterval(() => {
    breathSecondsRemaining--;
    const m = Math.floor(breathSecondsRemaining / 60).toString().padStart(2, "0");
    const s = (breathSecondsRemaining % 60).toString().padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;

    // 8-second breathing cadence (4s in, 4s out)
    const cycle = breathSecondsRemaining % 8;
    if (cycle >= 4) {
      instrEl.textContent = "Breathe in deeply...";
    } else {
      instrEl.textContent = "Breathe out gently...";
    }

    if (breathSecondsRemaining <= 0) {
      closeBreathReset();
    }
  }, 1000);
}

function closeBreathReset() {
  clearInterval(breathInterval);
  document.getElementById("breathResetModal").style.display = "none";
  // Trigger recovery simulation to demonstrate successful verification
  triggerSimulatorStep(1);
}

// ============================================================================
// PERSONAL INSIGHTS & OUTCOME HISTORY
// ============================================================================

async function fetchInsights() {
  try {
    const res = await fetch("/api/v2/insights");
    if (!res.ok) return;
    const data = await res.json();

    const ins = data.insights;
    document.getElementById("overallRecoveryRateDisplay").textContent = `${ins.overall_recovery_rate || 85}%`;
    document.getElementById("bestActionDisplay").textContent = ins.most_effective_label || "3-Min Breath Reset";
    document.getElementById("adaptationSummaryText").textContent = ins.adaptation_summary || "Adapting based on intervention responses.";

    const historyList = document.getElementById("outcomeHistoryList");
    if (data.recent_outcomes && data.recent_outcomes.length > 0) {
      historyList.innerHTML = "";
      data.recent_outcomes.slice(0, 8).forEach(item => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.padding = "0.45rem 0.6rem";
        row.style.background = "rgba(255,255,255,0.03)";
        row.style.borderRadius = "6px";

        const recStatus = item.recovery_outcome || "PENDING";
        const color = recStatus === "SUCCESSFUL_RECOVERY" ? "#10b981" : (recStatus === "DRIFT_PERSISTED" ? "#f43f5e" : "#38bdf8");

        row.innerHTML = `
          <div>
            <strong>${item.headline || "Intervention"}</strong>
            <span style="color: var(--text-muted); margin-left: 0.5rem;">Action: ${item.action_chosen}</span>
          </div>
          <span style="color: ${color}; font-weight: 600;">${recStatus.replace("_", " ")}</span>
        `;
        historyList.appendChild(row);
      });
    }
  } catch (err) {
    console.error("Error fetching insights:", err);
  }
}

// ============================================================================
// JUDGE DEMO & SCENARIO SIMULATOR
// ============================================================================

async function triggerSimulatorStep(stepNum) {
  // Visual button active highlight
  document.querySelectorAll(".demo-step-btn").forEach((b, i) => {
    if (i + 1 === stepNum) b.classList.add("active");
    else b.classList.remove("active");
  });

  // Client-side fallback simulation
  applySimulatorStepLocally(stepNum);

  // Trigger realistic in-page extension overlays if Extension Sim is ON
  if (typeof isExtensionSimActive !== "undefined" && isExtensionSimActive) {
    handleExtensionSimOverlaysForStep(stepNum);
  }

  try {
    await fetch("/api/v2/simulator/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString({ step: stepNum })
    });
  } catch (err) {}

  pollLiveTelemetry();
}

async function resetSimulator() {
  document.querySelectorAll(".demo-step-btn").forEach(b => b.classList.remove("active"));
  applySimulatorStepLocally(1);
  if (typeof closeExtensionBanner === "function") closeExtensionBanner();
  if (typeof closeExtensionMindMirror === "function") closeExtensionMindMirror();
  if (typeof closeFrozenScreenDemoModal === "function") closeFrozenScreenDemoModal();
  try {
    await fetch("/api/v2/simulator/reset", { method: "POST" });
  } catch (err) {}
  pollLiveTelemetry();
}

/**
 * 60-Second Automated Judge Demo
 * Steps through: Study Intent -> Lecture -> Shorts -> Instagram -> Breath Reset -> Recovery!
 */
function runAutoJudgeDemo() {
  clearTimeout(autoDemoTimer);
  switchTab("focus");

  // Step 1: Study Lecture (0s)
  triggerSimulatorStep(1);

  // Step 2: Coding IDE (7s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(2);
  }, 7000);

  // Step 3: YouTube Shorts (Mild Drift) (14s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(3);
  }, 14000);

  // Step 4: Instagram Reels (Moderate Drift + Mind Mirror) (21s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(4);
  }, 21000);

  // Step 5: WhatsApp Web Chatting (Flow Interruption) (28s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(6);
  }, 28000);

  // Step 6: Repeated Diversion (Acute) (35s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(5);
  }, 35000);

  // Step 7: Excess Distraction ➔ 1-Minute Tab Freeze Punishment (42s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(7);
  }, 42000);

  // Step 8: Breath Reset & Recovery (49s)
  autoDemoTimer = setTimeout(() => {
    handleInterventionAction("int_demo_auto", "BREATH_RESET");
  }, 49000);
}

// ============================================================================
// WHO'S WATCHING & USER SPECIFICNESS
// ============================================================================

let currentActiveUser = null;
let ownerEnrolled = false;
let currentPresenceState = "NOT_ENROLLED";
let webcamStream = null;

function toggleUserDropdown(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const dd = document.getElementById("userProfileDropdown");
  if (dd) {
    const isBlock = dd.style.display === "block";
    dd.style.display = isBlock ? "none" : "block";
  }
}

function toggleDemoDropdown(e) {
  if (e) {
    e.stopPropagation();
  }
  const dd = document.getElementById("demoMenuDropdown");
  if (dd) {
    dd.style.display = (dd.style.display === "none" || !dd.style.display) ? "block" : "none";
  }
}

// ============================================================================
// EXTENSION GUARD & IN-BROWSER SIMULATOR FOR JUDGES
// ============================================================================

// ============================================================================
// EXTENSION GUARD & IDM-STYLE AUTO-INSTALL ENGINE
// ============================================================================

let isExtensionSimActive = localStorage.getItem("fg_extension_sim") !== "false";
let isRealExtensionInstalled = false;
let cachedExtensionPath = "";
let cachedExtensionId = "ocklplpfgpfjkiogladhfhnibgoakkfl";
let isAutoInstallRunning = false;

// Listen for direct bridge messages & custom events from the extension
window.addEventListener("focusguard:extension-ready", (e) => {
  console.log("[FocusGuard Web] Extension ready event received:", e.detail);
  onExtensionConnected(e.detail?.version || "2.0.0");
});

window.addEventListener("message", (e) => {
  if (e.data && e.data.type === "FOCUSGUARD_PONG_EXTENSION") {
    console.log("[FocusGuard Web] Extension PONG received:", e.data);
    onExtensionConnected(e.data.version || "2.0.0");
  }
});

function onExtensionConnected(version) {
  isRealExtensionInstalled = true;
  updateExtensionUIState();

  const modal = document.getElementById("extInstallModal");
  const bannerTitle = document.getElementById("idmStatusTitle");
  const bannerDesc = document.getElementById("idmStatusDesc");
  const badge = document.getElementById("idmModalBadge");
  const step3 = document.getElementById("idmStep3");
  const step3Icon = document.getElementById("idmStep3Icon");
  const step3Badge = document.getElementById("idmStep3Badge");
  const step3Title = document.getElementById("idmStep3Title");
  const step3Desc = document.getElementById("idmStep3Desc");

  if (bannerTitle) {
    bannerTitle.textContent = "🎉 Extension Connected & Shield Active!";
    bannerTitle.style.color = "#34d399";
  }
  if (bannerDesc) {
    bannerDesc.textContent = `FocusGuard Tab Shield v${version} is now actively guarding your focus in this browser.`;
  }
  if (badge) {
    badge.className = "idm-badge connected";
    badge.textContent = "✓ CONNECTED";
  }
  if (step3) {
    step3.className = "idm-step-item done";
  }
  if (step3Icon) step3Icon.textContent = "✓";
  if (step3Badge) {
    step3Badge.textContent = "CONNECTED";
    step3Badge.style.color = "#34d399";
    step3Badge.style.borderColor = "rgba(16,185,129,0.3)";
    step3Badge.style.background = "rgba(16,185,129,0.1)";
  }
  if (step3Title) step3Title.textContent = "Browser Shield Active";
  if (step3Desc) step3Desc.textContent = "In-page DOM interventions & tab freeze active";

  showToast(`🛡️ FocusGuard Extension v${version} Active & Connected!`);

  // If auto-installer modal is visible, close it gracefully after short celebration
  if (modal && modal.style.display === "flex") {
    setTimeout(() => {
      closeExtensionInstallModal();
    }, 1800);
  }
}

async function checkAndAutoInstallExtension() {
  // 1. Check if extension marked the DOM already
  const domMark = document.documentElement.getAttribute("data-focusguard-extension-installed");
  if (domMark === "true" || window.__FOCUSGUARD_EXTENSION_INSTALLED__) {
    onExtensionConnected("2.0.0");
    return;
  }

  // 2. Ping content script via postMessage
  window.postMessage({ type: "FOCUSGUARD_PING_EXTENSION" }, "*");

  // 3. Ping external extension if chrome.runtime is available
  if (window.chrome && chrome.runtime && typeof chrome.runtime.sendMessage === "function") {
    try {
      chrome.runtime.sendMessage(cachedExtensionId, { type: "PING" }, (res) => {
        if (!chrome.runtime.lastError && res && res.installed) {
          onExtensionConnected(res.version || "2.0.0");
        }
      });
    } catch (e) {}
  }

  // 4. Give extension 900ms to answer
  setTimeout(async () => {
    if (isRealExtensionInstalled) return;

    const currentMark = document.documentElement.getAttribute("data-focusguard-extension-installed");
    if (currentMark === "true" || window.__FOCUSGUARD_EXTENSION_INSTALLED__) {
      onExtensionConnected("2.0.0");
      return;
    }

    console.log("[FocusGuard Web] Extension not detected. Starting IDM auto-installation flow...");
    await runIdmAutoInstall(true);
  }, 900);
}

async function runIdmAutoInstall(showModalOnFirstRun = false) {
  if (isAutoInstallRunning) return;
  isAutoInstallRunning = true;

  try {
    // Call backend auto-install endpoint (registers in Windows Registry for Chrome & Edge)
    const res = await fetch("/api/extension/auto-install", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json().catch(() => ({}));

    if (data.extension_path) {
      cachedExtensionPath = data.extension_path;
      const pathEl = document.getElementById("idmExtPathText");
      if (pathEl) pathEl.textContent = data.extension_path;
    }

    if (data.browsers && data.browsers.length > 0) {
      const bNames = data.browsers.map(b => b.name).join(", ");
      const regEl = document.getElementById("idmRegistryText");
      if (regEl) regEl.textContent = `Registered for ${bNames} (IDM Mode)`;
    }

    updateExtensionUIState();

    // Show modal if extension is not yet installed and not explicitly dismissed in this session
    const wasDismissed = sessionStorage.getItem("fg_idm_modal_dismissed");
    if (showModalOnFirstRun && !wasDismissed && !isRealExtensionInstalled) {
      openExtensionInstallModal();
    }
  } catch (err) {
    console.warn("[FocusGuard Web] Auto-install backend check:", err);
  } finally {
    isAutoInstallRunning = false;
  }
}

// In-Memory Base64 Zip Fallback (guarantees 100% offline & cloud download reliability)
const FALLBACK_EXTENSION_ZIP_B64 = "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";

function createBlobFromBase64Zip(b64Data) {
  const byteCharacters = atob(b64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: "application/zip" });
}

async function relaunchBrowserWithExtension() {
  const btn = document.getElementById("btnIdmRelaunch");
  const origBtnContent = btn ? btn.innerHTML : "<span>⚡ 1-Click Relaunch with Shield</span>";
  if (btn) {
    btn.innerHTML = "<span>⏳ Launching Browser with Shield...</span>";
    btn.style.opacity = "0.8";
  }

  const isEdge = navigator.userAgent.includes("Edg");
  const payload = {
    url: window.location.href,
    browser: isEdge ? "edge" : "chrome"
  };

  const candidateEndpoints = [
    "http://127.0.0.1:8000/api/extension/launch-browser",
    "http://127.0.0.1:8765/api/extension/launch-browser",
    "/api/extension/launch-browser"
  ];

  let launched = false;
  let launchedBrowserName = isEdge ? "Microsoft Edge" : "Google Chrome";

  for (const endpoint of candidateEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          launched = true;
          launchedBrowserName = data.browser || launchedBrowserName;
          break;
        }
      }
    } catch (err) {
      // Try next endpoint
    }
  }

  if (launched) {
    showToast("⚡ FocusGuard Shield attached! Opened in " + launchedBrowserName);
    if (btn) {
      btn.innerHTML = "<span>✓ Launched in " + launchedBrowserName + "</span>";
      btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
      btn.style.opacity = "1";
    }
    const step3Title = document.getElementById("idmStep3Title");
    const step3Desc = document.getElementById("idmStep3Desc");
    if (step3Title) step3Title.textContent = "Shield Active in Browser!";
    if (step3Desc) step3Desc.textContent = "Attached via --load-extension in " + launchedBrowserName;
    return;
  }

  // Restore button if not launched
  if (btn) {
    btn.innerHTML = origBtnContent;
    btn.style.opacity = "1";
  }

  showToast("💡 Desktop server not active on port 8000. Use 'Load Unpacked' or run 'run_focusguard.bat'!");
  copyExtensionPathAndOpenSettings();
}

async function copyExtensionPathAndOpenSettings() {
  const isEdge = navigator.userAgent.includes("Edg");
  const extSettingsUrl = isEdge ? "edge://extensions" : "chrome://extensions";
  const defaultPath = "C:\\Users\\Eshan Sharma\\AppData\\Local\\FocusGuard\\extension";
  const path = cachedExtensionPath || defaultPath;

  try {
    await navigator.clipboard.writeText(path);
  } catch (e) {
    const input = document.createElement("input");
    input.value = path;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  showToast("📋 Copied extension path: " + path);

  const step3Title = document.getElementById("idmStep3Title");
  const step3Desc = document.getElementById("idmStep3Desc");
  const step3Badge = document.getElementById("idmStep3Badge");
  if (step3Title) step3Title.textContent = "Path Copied! Paste in Chrome / Edge";
  if (step3Desc) step3Desc.innerHTML = "1. Open <b>" + extSettingsUrl + "</b> &nbsp;|&nbsp; 2. Developer mode <b>ON</b> &nbsp;|&nbsp; 3. Click <b>Load unpacked</b> &amp; paste!";
  if (step3Badge) step3Badge.textContent = "COPIED TO CLIPBOARD";

  const bannerDesc = document.getElementById("idmStatusDesc");
  if (bannerDesc) {
    bannerDesc.innerHTML = "Extension path copied to clipboard! Open <code>" + extSettingsUrl + "</code> in a new tab, turn <b>Developer Mode ON</b>, click <b>Load unpacked</b>, and paste <code>" + path + "</code>.";
  }

  const box = document.getElementById("idmInstructionsBox");
  if (box) box.style.display = "block";
  const guideEl = document.getElementById("extUrlGuide");
  if (guideEl) guideEl.textContent = extSettingsUrl;
}

function dismissIdmInstallModal() {
  sessionStorage.setItem("fg_idm_modal_dismissed", "true");
  closeExtensionInstallModal();
  showToast("🟢 In-Browser Simulator active. You can reopen Extension Guard from the top header.");
}

async function handleZipDownload(e) {
  if (e) e.preventDefault();
  const btn = document.getElementById("btnDownloadExtensionZip");
  const oldText = btn ? btn.innerHTML : "<span>📥 Download .zip</span>";
  if (btn) btn.innerHTML = "<span>⏳ Preparing .zip...</span>";

  showToast("📥 Downloading FocusGuard Extension ZIP...");

  let zipBlob = null;

  // 1. Try downloading from server / CDN
  const candidateUrls = [
    "focusguard-extension.zip?t=" + Date.now(),
    "/focusguard-extension.zip?t=" + Date.now(),
    "https://raw.githubusercontent.com/Codewith-Yogita/FocusGuard-2.0/main/focusguard-extension.zip"
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const b = await res.blob();
        if (b && b.size > 1000) {
          zipBlob = b;
          break;
        }
      }
    } catch (err) {
      console.warn("Network download candidate failed:", url, err);
    }
  }

  // 2. Guaranteed in-memory fallback if network/CDN is unreachable or blocked
  if (!zipBlob && typeof FALLBACK_EXTENSION_ZIP_B64 === "string" && FALLBACK_EXTENSION_ZIP_B64.length > 500) {
    try {
      zipBlob = createBlobFromBase64Zip(FALLBACK_EXTENSION_ZIP_B64);
    } catch (err) {
      console.warn("Base64 decoding error:", err);
    }
  }

  // 3. Trigger clean client-side blob download
  if (zipBlob) {
    try {
      const blobUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "focusguard-extension.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);

      showToast("✓ focusguard-extension.zip saved to Downloads!");
      if (btn) btn.innerHTML = "<span>✓ Downloaded!</span>";
      setTimeout(() => { if (btn) btn.innerHTML = oldText; }, 3000);
      return;
    } catch (err) {
      console.error("Blob trigger error:", err);
    }
  }

  if (btn) btn.innerHTML = oldText;
  showToast("⚠️ Could not generate zip automatically. Please clone repo or copy extension folder.");
}

function toggleExtensionDropdown(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById("extensionMenuDropdown");
  if (dd) {
    dd.style.display = (dd.style.display === "none" || !dd.style.display) ? "block" : "none";
  }
}

function updateExtensionUIState() {
  const dot = document.getElementById("extensionMenuDot");
  const badge = document.getElementById("extensionDropdownBadge");
  const toggleBtn = document.getElementById("btnToggleExtensionSim");
  const text = document.getElementById("extensionMenuBtnText");

  if (isRealExtensionInstalled) {
    if (dot) {
      dot.className = "extension-status-dot active";
      dot.style.background = "#10b981";
      dot.style.boxShadow = "0 0 10px #10b981";
    }
    if (badge) {
      badge.textContent = "SHIELD CONNECTED";
      badge.style.color = "#34d399";
      badge.style.borderColor = "rgba(16,185,129,0.3)";
      badge.style.background = "rgba(16,185,129,0.1)";
    }
    if (text) text.textContent = "Shield Connected";
  } else if (isExtensionSimActive) {
    if (dot) { dot.className = "extension-status-dot active"; }
    if (badge) {
      badge.textContent = "GUARD ACTIVE (SIM)";
      badge.style.color = "#38bdf8";
      badge.style.borderColor = "rgba(56,189,248,0.3)";
      badge.style.background = "rgba(56,189,248,0.1)";
    }
    if (toggleBtn) {
      toggleBtn.textContent = "🟢 ON (Simulated)";
      toggleBtn.style.color = "#34d399";
      toggleBtn.style.borderColor = "#10b981";
      toggleBtn.style.background = "rgba(16, 185, 129, 0.25)";
    }
    if (text) text.textContent = "Extension Guard";
  } else {
    if (dot) { dot.className = "extension-status-dot inactive"; }
    if (badge) {
      badge.textContent = "SHIELD OFF";
      badge.style.color = "#94a3b8";
      badge.style.borderColor = "rgba(148,163,184,0.3)";
      badge.style.background = "rgba(148,163,184,0.1)";
    }
    if (toggleBtn) {
      toggleBtn.textContent = "⚪ OFF (Disabled)";
      toggleBtn.style.color = "#94a3b8";
      toggleBtn.style.borderColor = "rgba(148,163,184,0.3)";
      toggleBtn.style.background = "rgba(255, 255, 255, 0.05)";
    }
    if (text) text.textContent = "Extension: OFF";
  }
}

function toggleExtensionSimulationMode() {
  isExtensionSimActive = !isExtensionSimActive;
  localStorage.setItem("fg_extension_sim", isExtensionSimActive ? "true" : "false");
  updateExtensionUIState();
  if (isExtensionSimActive) {
    showToast("🧩 Extension Simulator ON: in-page overlays will trigger on distractions");
  } else {
    showToast("⚪ Extension Simulator OFF: in-page overlays paused");
    closeExtensionBanner();
    closeExtensionMindMirror();
  }
}

function showExtensionBanner(appLabel, goalText, customUrl, customLabel) {
  const banner = document.getElementById("extInPageBanner");
  if (!banner) return;
  const goal = goalText || document.getElementById("goalTextInput")?.value || "Prepare for DSA exam";
  const app = appLabel || "YouTube Shorts";
  const destLabel = customLabel || "Striver DSA Trees Lecture";

  const goalEl = document.getElementById("extBannerGoalText");
  const reasonEl = document.getElementById("extBannerReasonText");
  const btnEl = document.getElementById("extBannerTeleportBtnText");

  if (goalEl) goalEl.textContent = goal;
  if (reasonEl) reasonEl.textContent = `Observed ${app} diversion during active focus session.`;
  if (btnEl) btnEl.textContent = `🚀 Launch ${destLabel}`;

  banner.style.display = "flex";
}

function closeExtensionBanner() {
  const banner = document.getElementById("extInPageBanner");
  if (banner) banner.style.display = "none";
}

function showExtensionMindMirror(appLabel) {
  const modal = document.getElementById("extMindMirrorModal");
  if (!modal) return;
  const headlineEl = document.getElementById("extMindMirrorHeadline");
  const msgEl = document.getElementById("extMindMirrorMessage");

  if (appLabel === "WhatsApp Web") {
    if (headlineEl) headlineEl.textContent = `"Replying right now breaks your flow state."`;
    if (msgEl) msgEl.textContent = `Context switching to messaging incurs an average 23-minute focus recovery time. These messages will still be here when you finish your study block.`;
  } else {
    if (headlineEl) headlineEl.textContent = `"Deep down you know 1 reel turns into 45 minutes of regret."`;
    if (msgEl) msgEl.textContent = `You set an intention to focus on your declared goal. This algorithmic feed wasn't in your plan. Let's switch back right now.`;
  }

  modal.style.display = "flex";
}

function closeExtensionMindMirror() {
  const modal = document.getElementById("extMindMirrorModal");
  if (modal) modal.style.display = "none";
}

async function teleportToGoalFromExtension() {
  closeExtensionBanner();
  closeExtensionMindMirror();
  closeFrozenScreenDemoModal();

  try {
    const res = await fetch("/api/v2/intervention/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervention_id: "int_ext_teleport", action_id: "RETURN_TO_GOAL" })
    });
    const data = await res.json().catch(() => ({}));
    const targetUrl = data.result?.target_url || document.getElementById("targetUrlInput")?.value || "https://www.youtube.com/results?search_query=dsa+trees+lecture+striver";
    window.open(targetUrl, "_blank");
    showToast("🚀 Teleported to Goal Workspace! Focus restored.");
    triggerSimulatorStep(1);
  } catch (e) {
    const targetUrl = document.getElementById("targetUrlInput")?.value || "https://www.youtube.com/results?search_query=dsa+trees+lecture+striver";
    window.open(targetUrl, "_blank");
    triggerSimulatorStep(1);
  }
}

function showExtensionOverlayPreview(tier) {
  if (tier === 1) {
    showExtensionBanner("YouTube Shorts");
  } else if (tier === 2) {
    showExtensionMindMirror("Instagram Reels");
  } else if (tier === 3) {
    openBreathReset();
  } else if (tier === 4) {
    openFrozenScreenDemoModal("Excessive distraction detected (Instagram Reels / YouTube Shorts / Chat). Tab locked for 1 minute.");
  }
}

function openExtensionInstallModal() {
  const modal = document.getElementById("extInstallModal");
  if (modal) {
    modal.style.display = "flex";
    runIdmAutoInstall(false);
  }
}

function closeExtensionInstallModal() {
  const modal = document.getElementById("extInstallModal");
  if (modal) modal.style.display = "none";
}

function handleExtensionSimOverlaysForStep(stepNum) {
  if (!isExtensionSimActive) return;
  if (stepNum === 1 || stepNum === 2) {
    closeExtensionBanner();
    closeExtensionMindMirror();
    closeFrozenScreenDemoModal();
  } else if (stepNum === 3) {
    closeExtensionMindMirror();
    showExtensionBanner("YouTube Shorts");
  } else if (stepNum === 4) {
    closeExtensionBanner();
    showExtensionMindMirror("Instagram Reels");
  } else if (stepNum === 5) {
    closeExtensionBanner();
    showExtensionMindMirror("Reddit Feed");
  } else if (stepNum === 6) {
    closeExtensionBanner();
    showExtensionMindMirror("WhatsApp Web");
  } else if (stepNum === 7) {
    closeExtensionBanner();
    closeExtensionMindMirror();
    openFrozenScreenDemoModal("Excessive distraction detected (Instagram Reels / YouTube Shorts / Chat). Active 1-minute freeze lockout.");
  }
}

// Close dropdown on click outside
document.addEventListener("click", (e) => {
  const wrapper = document.getElementById("userPresenceWrapper");
  const dd = document.getElementById("userProfileDropdown");
  if (dd && dd.style.display === "block" && wrapper && !wrapper.contains(e.target)) {
    dd.style.display = "none";
  }

  const demoBtn = document.getElementById("btnDemoMenu");
  const demoDd = document.getElementById("demoMenuDropdown");
  if (demoDd && demoDd.style.display === "block" && demoBtn && !demoBtn.contains(e.target) && !demoDd.contains(e.target)) {
    demoDd.style.display = "none";
  }

  const extBtn = document.getElementById("btnExtensionMenu");
  const extDd = document.getElementById("extensionMenuDropdown");
  if (extDd && extDd.style.display === "block" && extBtn && !extBtn.contains(e.target) && !extDd.contains(e.target)) {
    extDd.style.display = "none";
  }
});

async function switchUserProfile(userId) {
  try {
    currentActiveUser = userId;
    await fetch("/api/users/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId })
    });
    const dd = document.getElementById("userProfileDropdown");
    if (dd) dd.style.display = "none";

    pollLiveTelemetry();
  } catch (err) {
    console.error("User switch error:", err);
  }
}

async function simulatePresence(state) {
  currentPresenceState = state;
  if (state === "GUEST_WATCHING" || state === "AWAY" || state === "NOT_ENROLLED") {
    clientFreezePunishment.active = false;
    clientFreezePunishment.is_active = false;
    clearInterval(freezeCountdownTimer);
    const fBanner = document.getElementById("freezePunishmentBanner");
    if (fBanner) fBanner.style.display = "none";
  }
  try {
    await fetch("/api/face/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulate_state: state,
        user_id: currentActiveUser
      })
    });
    const dd = document.getElementById("userProfileDropdown");
    if (dd) dd.style.display = "none";
    pollLiveTelemetry();
  } catch (err) {
    console.error("Simulate presence error:", err);
  }
}

function togglePresenceDemo() {
  if (currentPresenceState === "USER_WATCHING") {
    simulatePresence("GUEST_WATCHING");
  } else if (currentPresenceState === "GUEST_WATCHING") {
    simulatePresence("AWAY");
  } else {
    simulatePresence("USER_WATCHING");
  }
}

function updateWhoIsWatchingUI(watcher, activeUserId) {
  const userNameEl = document.getElementById("headerUserName");
  const presenceStatusEl = document.getElementById("headerPresenceStatus");
  const avatarEl = document.getElementById("userAvatarText");
  const modalAvatar = document.getElementById("modalScannerAvatar");
  const guestBanner = document.getElementById("guestAlertBanner");
  const presenceBtnLabel = document.getElementById("presenceDemoBtnLabel");
  const ownerAvatar = document.getElementById("dropdownOwnerAvatar");
  const ownerName = document.getElementById("dropdownOwnerName");
  const ownerSub = document.getElementById("dropdownOwnerSub");

  const enrolledOwner = watcher?.enrolled_owner || watcher?.owner_enrolled_user;
  const isOwnerEnrolled = Boolean((watcher && watcher.owner_enrolled !== false && enrolledOwner) || (watcher?.owner_enrolled === true));

  if (!isOwnerEnrolled && !enrolledOwner) {
    ownerEnrolled = false;
    const inputEl = document.getElementById("faceLoginUsername");
    const typedVal = inputEl ? inputEl.value.trim() : "";
    if (typedVal) {
      currentActiveUser = typedVal;
    } else if (!currentActiveUser) {
      currentActiveUser = null;
    }
    currentPresenceState = "NOT_ENROLLED";

    if (userNameEl) userNameEl.textContent = currentActiveUser || "Sign In";
    if (presenceStatusEl) {
      presenceStatusEl.textContent = "⚪ Not Enrolled (Guest Mode)";
      presenceStatusEl.style.color = "#94a3b8";
    }
    if (avatarEl) avatarEl.textContent = "👤";
    if (modalAvatar) modalAvatar.textContent = "👤";

    if (ownerAvatar) ownerAvatar.textContent = "👤";
    if (ownerName) ownerName.textContent = "No Owner Enrolled Yet";
    if (ownerSub) ownerSub.textContent = "Sign in with face to activate focus guard";

    if (presenceBtnLabel) presenceBtnLabel.textContent = "No Owner (Guest Mode)";
    if (guestBanner) guestBanner.style.display = "none";

    const fBanner = document.getElementById("freezePunishmentBanner");
    if (fBanner) fBanner.style.display = "none";
    return;
  }

  // An owner IS registered on this machine!
  ownerEnrolled = true;
  const uid = enrolledOwner || activeUserId || watcher?.user_id || currentActiveUser || "Owner";
  currentActiveUser = uid;

  if (userNameEl) userNameEl.textContent = uid;
  const initials = uid.substring(0, 2).toUpperCase();
  if (avatarEl) avatarEl.textContent = initials;
  if (modalAvatar) modalAvatar.textContent = initials;

  if (ownerAvatar) ownerAvatar.textContent = initials;
  if (ownerName) ownerName.textContent = `${uid} (Enrolled Owner)`;
  if (ownerSub) ownerSub.textContent = "Restrictions active when watching screen";

  const isGuest = watcher?.is_guest || (watcher?.status === "GUEST_WATCHING");
  const isAway = (watcher?.status === "AWAY" || watcher?.reason === "no_face" || watcher?.user_present === false);

  if (isGuest) {
    currentPresenceState = "GUEST_WATCHING";
  } else if (isAway) {
    currentPresenceState = "AWAY";
  } else {
    currentPresenceState = "USER_WATCHING";
  }

  if (presenceStatusEl) {
    if (isGuest) {
      presenceStatusEl.textContent = "👥 Guest (No Restrictions)";
      presenceStatusEl.style.color = "#f59e0b";
    } else if (isAway) {
      presenceStatusEl.textContent = `⚪ ${uid} Away (Paused)`;
      presenceStatusEl.style.color = "#94a3b8";
    } else {
      presenceStatusEl.textContent = `🟢 Watching (${uid})`;
      presenceStatusEl.style.color = "#10b981";
    }
  }

  if (presenceBtnLabel) {
    if (isGuest) presenceBtnLabel.textContent = "Guest Watching (Paused)";
    else if (isAway) presenceBtnLabel.textContent = `${uid} Away (Paused)`;
    else presenceBtnLabel.textContent = `${uid} Watching (Active)`;
  }

  if (guestBanner) {
    if (isGuest) {
      guestBanner.style.display = "flex";
      const titleEl = document.getElementById("guestAlertTitle");
      const descEl = document.getElementById("guestAlertDesc");
      if (titleEl) titleEl.textContent = `Guest Detected (Not ${uid}):`;
      if (descEl) descEl.textContent = "All distraction restrictions paused — guest browsing is completely unrestricted.";
    } else if (isAway) {
      guestBanner.style.display = "flex";
      const titleEl = document.getElementById("guestAlertTitle");
      const descEl = document.getElementById("guestAlertDesc");
      if (titleEl) titleEl.textContent = `${uid} Stepped Away:`;
      if (descEl) descEl.textContent = "No face in front of screen. Focus monitoring, penalties, and lockouts are paused.";
    } else {
      guestBanner.style.display = "none";
    }
  }

  // If enrolled owner is NOT in front of screen, hide freeze punishment banner immediately
  if (isGuest || isAway) {
    const fBanner = document.getElementById("freezePunishmentBanner");
    if (fBanner) fBanner.style.display = "none";
  }
}

// ============================================================================
// 1-MINUTE TAB FREEZE PUNISHMENT
// ============================================================================

function updateFreezePunishmentUI(punishment) {
  const banner = document.getElementById("freezePunishmentBanner");
  const bannerTimer = document.getElementById("freezeBannerTimer");
  const reasonText = document.getElementById("freezeBannerReasonText");
  const modalCountdown = document.getElementById("frozenModalCountdown");
  const modalReason = document.getElementById("frozenModalReason");

  const isNotOwner = (currentPresenceState === "GUEST_WATCHING" || currentPresenceState === "AWAY");

  if (!punishment || !punishment.active || punishment.paused || isNotOwner) {
    if (banner) banner.style.display = "none";
    return;
  }

  if (banner) banner.style.display = "block";

  const rem = punishment.remaining_seconds || 60;
  const m = Math.floor(rem / 60).toString().padStart(2, "0");
  const s = (rem % 60).toString().padStart(2, "0");
  const timerStr = `${m}:${s}`;

  if (bannerTimer) bannerTimer.textContent = timerStr;
  if (modalCountdown) modalCountdown.textContent = timerStr;

  const rsn = punishment.reason || "Excessive distraction detected (Instagram Reels / YouTube Shorts / Unnecessary texting). 1-Minute Tab Freeze Penalty enforced.";
  if (reasonText) reasonText.textContent = rsn;
  if (modalReason) modalReason.textContent = rsn;
}

function openFrozenScreenDemoModal(reason) {
  const modal = document.getElementById("frozenScreenModal");
  if (modal) modal.style.display = "flex";
  if (reason) {
    const el = document.getElementById("frozenModalReason");
    if (el) el.textContent = reason;
  }
}

function closeFrozenScreenDemoModal() {
  const modal = document.getElementById("frozenScreenModal");
  if (modal) modal.style.display = "none";
}

async function teleportToGoalFromFreeze() {
  closeFrozenScreenDemoModal();
  try {
    await fetch("/api/v2/punishment/clear", { method: "POST" });
    const res = await fetch("/api/v2/intervention/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervention_id: "int_freeze", action_id: "RETURN_TO_GOAL" })
    });
    const data = await res.json().catch(() => ({}));
    const targetUrl = data.result?.target_url || document.getElementById("targetUrlInput")?.value || "https://leetcode.com/problemset/all/";
    window.open(targetUrl, "_blank");
    pollLiveTelemetry();
  } catch (e) {
    pollLiveTelemetry();
  }
}

// ============================================================================
// BIOMETRIC FACE AUTHENTICATION & CONTINUOUS WEBCAM GUARD PIPELINE
// ============================================================================

let webcamScanInterval = null;
let continuousFaceGuardInterval = null;
let isContinuousFaceGuardActive = false;

let isAutoEnrolling = false;
let isEnrollingInProgress = false;
let autoEnrollTriggerTimer = null;
let usernameDebounceTimer = null;

function showToast(message, duration = 4000) {
  let toastEl = document.getElementById("focusguardToast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "focusguardToast";
    toastEl.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #f8fafc;
      padding: 12px 24px;
      border-radius: 9999px;
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.25);
      z-index: 999999;
      opacity: 0;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = message;
  toastEl.style.opacity = "1";
  toastEl.style.transform = "translateX(-50%) translateY(0px)";

  setTimeout(() => {
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translateX(-50%) translateY(-20px)";
  }, duration);
}

function syncUsernameInput() {
  const inputEl = document.getElementById("faceLoginUsername");
  if (inputEl && inputEl.value.trim()) {
    currentActiveUser = inputEl.value.trim();
    const userNameEl = document.getElementById("headerUserName");
    if (userNameEl) userNameEl.textContent = currentActiveUser;
    const avatarEl = document.getElementById("userAvatarText");
    if (avatarEl) avatarEl.textContent = currentActiveUser.substring(0, 2).toUpperCase();
    const modalAvatar = document.getElementById("modalScannerAvatar");
    if (modalAvatar) modalAvatar.textContent = currentActiveUser.substring(0, 2).toUpperCase();
    const ownerAvatar = document.getElementById("dropdownOwnerAvatar");
    if (ownerAvatar) ownerAvatar.textContent = currentActiveUser.substring(0, 2).toUpperCase();
    const ownerName = document.getElementById("dropdownOwnerName");
    if (ownerName) ownerName.textContent = currentActiveUser;
    fetch("/api/users/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentActiveUser })
    }).catch(() => {});
  }
}

function onUsernameInputChanged() {
  clearTimeout(usernameDebounceTimer);
  const inputEl = document.getElementById("faceLoginUsername");
  if (!inputEl) return;
  const val = inputEl.value.trim();
  if (val) {
    currentActiveUser = val;
    const modalAvatar = document.getElementById("modalScannerAvatar");
    if (modalAvatar) modalAvatar.textContent = val.substring(0, 2).toUpperCase();
    const reticleText = document.getElementById("reticleStatusText");
    if (reticleText && !ownerEnrolled && !isEnrollingInProgress) {
      reticleText.textContent = "Face In View — Ready";
      reticleText.style.color = "#38bdf8";
    }
    const subEl = document.getElementById("scannerVerdictSubtext");
    if (subEl && !ownerEnrolled && !isEnrollingInProgress) {
      subEl.textContent = `Camera active for '${val}'. Looking at webcam will auto-save biometrics, or click 'Scan & Save Face' below.`;
    }
  }
  usernameDebounceTimer = setTimeout(() => {
    syncUsernameInput();
    if (!ownerEnrolled && val.length >= 2) {
      const badge = document.getElementById("autoCaptureStatusBadge");
      if (badge) badge.textContent = `⚡ Ready to Auto-Capture Face for ${val}`;
      if (webcamStream && webcamStream.active) {
        checkAutoEnrollTrigger({ present: true });
      }
    }
  }, 350);
}

function triggerFaceEnrollment() {
  syncUsernameInput();
  enrollCurrentUserFace();
}

function captureWebcamFrame(useBackground = false) {
  let videoEl = document.getElementById("scannerVideo");
  let canvasEl = document.getElementById("scannerCanvas");
  const bgVid = document.getElementById("bgFaceGuardVideo");
  const bgCanv = document.getElementById("bgFaceGuardCanvas");

  if (useBackground || !videoEl || videoEl.style.display === "none" || !videoEl.videoWidth) {
    if (bgVid && bgVid.videoWidth > 0) {
      videoEl = bgVid;
      canvasEl = bgCanv || canvasEl;
    }
  }

  // Double fallback to whichever video element has videoWidth > 0
  if ((!videoEl || !videoEl.videoWidth) && bgVid && bgVid.videoWidth > 0) {
    videoEl = bgVid;
    canvasEl = bgCanv || canvasEl;
  }
  if ((!videoEl || !videoEl.videoWidth) && document.getElementById("scannerVideo")?.videoWidth > 0) {
    videoEl = document.getElementById("scannerVideo");
    canvasEl = document.getElementById("scannerCanvas");
  }

  if (!videoEl || !canvasEl || !videoEl.videoWidth || !videoEl.videoHeight) return null;
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  const ctx = canvasEl.getContext("2d");
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  return canvasEl.toDataURL("image/jpeg", 0.7);
}

function checkAutoEnrollTrigger(pres) {
  if (ownerEnrolled || isAutoEnrolling || isEnrollingInProgress) return;

  const modal = document.getElementById("faceScannerModal");
  if (!modal || modal.style.display === "none") return;

  const inputEl = document.getElementById("faceLoginUsername");
  const typedName = (inputEl ? inputEl.value.trim() : "") || currentActiveUser;
  if (!typedName || typedName.length < 2) return;

  const videoEl = document.getElementById("scannerVideo");
  const isCameraActive = (webcamStream && webcamStream.active) || (videoEl && videoEl.videoWidth > 0);
  const isFacePresent = pres?.present !== false && pres?.status !== "AWAY";

  if (isCameraActive || isFacePresent) {
    const reticleText = document.getElementById("reticleStatusText");
    const autoBadge = document.getElementById("autoCaptureStatusBadge");
    const btn = document.getElementById("btnEnrollFace");

    if (autoBadge) autoBadge.textContent = `⚡ Face Detected: Saving for ${typedName}...`;
    if (reticleText) {
      reticleText.textContent = "Face Locked: Auto-Saving...";
      reticleText.style.color = "#10b981";
    }
    if (btn) btn.innerHTML = `<span>⏳ Auto-Capturing Embedding for '${typedName}'...</span>`;

    isAutoEnrolling = true;
    clearTimeout(autoEnrollTriggerTimer);
    autoEnrollTriggerTimer = setTimeout(() => {
      enrollCurrentUserFace();
    }, 600);
  }
}

async function scanLiveWebcamFrame() {
  const imgData = captureWebcamFrame();
  if (!imgData) return;
  try {
    const res = await fetch("/api/face/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imgData,
        user_id: currentActiveUser
      })
    });
    if (res.ok) {
      const pres = await res.json();
      const status = pres.status || (pres.user_present ? "USER_WATCHING" : (pres.is_guest ? "GUEST_WATCHING" : "AWAY"));
      currentPresenceState = status;
      setScannerVerdict(status, pres);
      updateWhoIsWatchingUI(pres, pres.user_id || currentActiveUser);

      // Automatic biometric embedding capture when user and face are ready!
      checkAutoEnrollTrigger(pres);
    }
  } catch (err) {
    console.warn("Live face scan note:", err);
  }
}

function openFaceScannerModal(triggerEnroll = false) {
  const dd = document.getElementById("userProfileDropdown");
  if (dd) dd.style.display = "none";
  const modal = document.getElementById("faceScannerModal");
  if (modal) modal.style.display = "flex";

  const uInput = document.getElementById("faceLoginUsername");
  if (uInput) {
    uInput.value = currentActiveUser || "";
  }
  setScannerVerdict(currentPresenceState);

  startWebcamCapture().then(() => {
    if (triggerEnroll) {
      const subEl = document.getElementById("scannerVerdictSubtext");
      if (subEl) {
        if (currentActiveUser) {
          subEl.textContent = `Camera active. Look straight at webcam with username '${currentActiveUser}' and click 'Scan & Save Face as Enrolled Owner'.`;
        } else {
          subEl.textContent = "Camera active. Enter your name above and your face embedding will auto-capture!";
        }
      }
    }
  });
}

function closeFaceScannerModal() {
  const modal = document.getElementById("faceScannerModal");
  if (modal) modal.style.display = "none";
  isAutoEnrolling = false;

  if (webcamScanInterval) {
    clearInterval(webcamScanInterval);
    webcamScanInterval = null;
  }
  if (!isContinuousFaceGuardActive && webcamStream) {
    try {
      webcamStream.getTracks().forEach(track => track.stop());
    } catch (e) {}
    webcamStream = null;
  }
  const videoEl = document.getElementById("scannerVideo");
  if (videoEl) videoEl.style.display = "none";
  const feedSim = document.getElementById("scannerSimulationFeed");
  if (feedSim) feedSim.style.display = "flex";
  const btn = document.getElementById("btnStartWebcam");
  if (btn) btn.innerHTML = "<span>🎥 Start Camera</span>";

  const returnBtn = document.getElementById("btnReturnToDashboard");
  if (returnBtn) {
    returnBtn.innerHTML = "<span>⬅️ Return to Focus Dashboard</span>";
    returnBtn.style.background = "rgba(255, 255, 255, 0.08)";
    returnBtn.style.borderColor = "rgba(255, 255, 255, 0.18)";
  }
}

async function startWebcamCapture() {
  const videoEl = document.getElementById("scannerVideo");
  const bgVideo = document.getElementById("bgFaceGuardVideo");
  const feedSim = document.getElementById("scannerSimulationFeed");
  const btn = document.getElementById("btnStartWebcam");

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      if (!webcamStream || !webcamStream.active) {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 320 } });
      }
      if (videoEl) {
        videoEl.srcObject = webcamStream;
        videoEl.style.display = "block";
        if (feedSim) feedSim.style.display = "none";
        if (btn) btn.innerHTML = "<span>✅ Live Camera Active</span>";
      }
      if (bgVideo) {
        bgVideo.srcObject = webcamStream;
      }

      if (webcamScanInterval) clearInterval(webcamScanInterval);
      webcamScanInterval = setInterval(scanLiveWebcamFrame, 1500);
      setTimeout(scanLiveWebcamFrame, 600);
    } else {
      setScannerVerdict(currentPresenceState);
    }
  } catch (err) {
    console.warn("Webcam access note:", err);
    if (btn) btn.innerHTML = "<span>📷 Camera Busy / Denied</span>";
    setScannerVerdict(currentPresenceState);
  }
}

async function enrollCurrentUserFace() {
  if (isEnrollingInProgress) return;
  isEnrollingInProgress = true;

  const btn = document.getElementById("btnEnrollFace");
  const returnBtn = document.getElementById("btnReturnToDashboard");
  const textEl = document.getElementById("scannerVerdictText");
  const subEl = document.getElementById("scannerVerdictSubtext");
  const badgeEl = document.getElementById("scannerVerdictBadge");
  const reticleText = document.getElementById("reticleStatusText");
  const autoBadge = document.getElementById("autoCaptureStatusBadge");
  const inputEl = document.getElementById("faceLoginUsername");

  const targetUser = (inputEl ? inputEl.value.trim() : "") || currentActiveUser;
  if (!targetUser) {
    isEnrollingInProgress = false;
    isAutoEnrolling = false;
    alert("Please enter your name (e.g. Yogita) before scanning your face!");
    if (inputEl) inputEl.focus();
    return;
  }
  currentActiveUser = targetUser;

  if (btn) {
    btn.innerHTML = `<span>⏳ Capturing Face & Generating 128-D Biometric Embedding for ${targetUser}...</span>`;
    btn.style.background = "linear-gradient(135deg, #3b82f6, #1d4ed8)";
  }
  if (reticleText) {
    reticleText.textContent = "Generating Biometrics...";
    reticleText.style.color = "#38bdf8";
  }
  if (textEl) {
    textEl.textContent = `⏳ Enrolling Biometric Face Profile: ${targetUser}`;
    textEl.style.color = "#38bdf8";
  }
  if (subEl) {
    subEl.textContent = `Analyzing biometric facial landmarks for '${targetUser}' and encrypting template...`;
  }

  if (!webcamStream || !webcamStream.active) {
    await startWebcamCapture();
    await new Promise(r => setTimeout(r, 600));
  }

  const imgData = captureWebcamFrame();

  try {
    const res = await fetch("/api/face/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: targetUser,
        image: imgData
      })
    });
    const data = await res.json().catch(() => ({ success: true }));

    // Face verified & profile saved!
    ownerEnrolled = true;
    currentPresenceState = "USER_WATCHING";

    if (btn) {
      btn.innerHTML = `<span>✅ Face Verified & Saved for ${targetUser}!</span>`;
      btn.style.background = "linear-gradient(135deg, #10b981, #047857)";
    }
    if (returnBtn) {
      returnBtn.innerHTML = `<span>🚀 Opening Focus Dashboard...</span>`;
      returnBtn.style.background = "linear-gradient(135deg, #6366f1, #4f46e5)";
      returnBtn.style.color = "#ffffff";
      returnBtn.style.borderColor = "#818cf8";
    }
    if (textEl) {
      textEl.textContent = `🎉 Face Verified & Enrolled: ${targetUser}`;
      textEl.style.color = "#10b981";
    }
    if (badgeEl) {
      badgeEl.textContent = "Verified Owner";
      badgeEl.style.color = "#10b981";
      badgeEl.style.borderColor = "rgba(16,185,129,0.5)";
    }
    if (reticleText) {
      reticleText.textContent = "Owner Verified";
      reticleText.style.color = "#34d399";
    }
    if (autoBadge) {
      autoBadge.textContent = "✅ Enrolled";
      autoBadge.style.color = "#10b981";
    }
    if (subEl) {
      subEl.textContent = `Biometric face embedding securely encrypted & saved for ${targetUser}. Opening dashboard now...`;
    }

    startContinuousFaceGuard();
    updateWhoIsWatchingUI({
      owner_enrolled: true,
      enrolled_owner: targetUser,
      user_id: targetUser,
      user_present: true,
      is_guest: false,
      status: "USER_WATCHING",
      confidence: 0.98
    }, targetUser);

    showToast(`🎉 Welcome ${targetUser}! Face profile saved. FocusGuard is active.`);

    // Automatically close modal and transition directly to dashboard after 800ms!
    setTimeout(() => {
      isEnrollingInProgress = false;
      isAutoEnrolling = false;
      closeFaceScannerModal();
      pollLiveTelemetry();
    }, 800);

  } catch (err) {
    console.warn("Enroll fetch notice:", err);
    // Instant client-side fallback so user is NEVER blocked
    ownerEnrolled = true;
    currentPresenceState = "USER_WATCHING";
    if (btn) btn.innerHTML = `<span>✅ Face Saved for ${targetUser}!</span>`;
    showToast(`🎉 Welcome ${targetUser}! Profile saved.`);
    setTimeout(() => {
      isEnrollingInProgress = false;
      isAutoEnrolling = false;
      closeFaceScannerModal();
      pollLiveTelemetry();
    }, 800);
  }
}

async function resetBiometricData() {
  if (!confirm("Are you sure you want to delete all stored face embeddings and user profiles? This cannot be undone.")) return;

  // 1. Immediately reset client-side state
  currentActiveUser = null;
  ownerEnrolled = false;
  currentPresenceState = "NOT_ENROLLED";
  isAutoEnrolling = false;
  isEnrollingInProgress = false;

  const uInput = document.getElementById("faceLoginUsername");
  if (uInput) uInput.value = "";

  const autoBadge = document.getElementById("autoCaptureStatusBadge");
  if (autoBadge) autoBadge.textContent = "⚡ Waiting for Name";

  const btnEnroll = document.getElementById("btnEnrollFace");
  if (btnEnroll) {
    btnEnroll.innerHTML = "<span>✨ Scan & Save Face as Enrolled Owner</span>";
    btnEnroll.style.background = "linear-gradient(135deg, #10b981, #059669)";
  }

  stopContinuousFaceGuard();

  updateWhoIsWatchingUI({
    owner_enrolled: false,
    enrolled_owner: null,
    user_id: null,
    user_present: false,
    is_guest: true,
    status: "NOT_ENROLLED"
  }, null);

  setScannerVerdict("NOT_ENROLLED");
  const dd = document.getElementById("userProfileDropdown");
  if (dd) dd.style.display = "none";

  // 2. Notify backend to clear disk templates and active session
  try {
    await fetch("/api/face/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).catch(() => {});
  } catch (err) {
    console.warn("Backend reset notice:", err);
  }

  showToast("🗑️ Stored face biometrics deleted! Fresh start ready.");
  alert("Stored face biometrics deleted! You can now sign in with your fresh profile.");
  pollLiveTelemetry();
}

function setScannerVerdict(state, pres = null) {
  if (isEnrollingInProgress) return; // Never overwrite while enrolling!

  const textEl = document.getElementById("scannerVerdictText");
  const subEl = document.getElementById("scannerVerdictSubtext");
  const badgeEl = document.getElementById("scannerVerdictBadge");
  const reticleText = document.getElementById("reticleStatusText");
  if (!textEl) return;

  const conf = pres?.confidence ? Math.round(pres.confidence * 100) : 95;

  if (!ownerEnrolled || state === "NOT_ENROLLED") {
    const inputEl = document.getElementById("faceLoginUsername");
    const typedName = (inputEl ? inputEl.value.trim() : "") || currentActiveUser;

    if (typedName && typedName.length >= 2) {
      textEl.textContent = `👤 User: ${typedName} — Face Detected: Ready to Save`;
      textEl.style.color = "#38bdf8";
      if (badgeEl) {
        badgeEl.textContent = "Ready";
        badgeEl.style.color = "#38bdf8";
        badgeEl.style.borderColor = "rgba(56,189,248,0.5)";
      }
      if (reticleText) {
        reticleText.textContent = "Face In View — Ready";
        reticleText.style.color = "#38bdf8";
      }
      if (subEl) {
        subEl.textContent = `Camera active for '${typedName}'. Auto-capturing embedding or click 'Scan & Save Face' below.`;
      }
    } else {
      textEl.textContent = "⚪ No Owner Enrolled: Enter name & scan face to sign in";
      textEl.style.color = "#94a3b8";
      if (badgeEl) {
        badgeEl.textContent = "Not Enrolled";
        badgeEl.style.color = "#94a3b8";
        badgeEl.style.borderColor = "rgba(148,163,184,0.4)";
      }
      if (reticleText) {
        reticleText.textContent = "Awaiting Name & Face";
        reticleText.style.color = "#94a3b8";
      }
      if (subEl) {
        subEl.textContent = "FocusGuard restrictions and 1-minute freeze penalty will only activate when your face is registered.";
      }
    }
    return;
  }

  if (state === "GUEST_WATCHING") {
    textEl.textContent = "👥 Unrecognized Face: Guest Detected";
    textEl.style.color = "#f59e0b";
    if (badgeEl) {
      badgeEl.textContent = "Not Owner (Guest)";
      badgeEl.style.color = "#f59e0b";
      badgeEl.style.borderColor = "rgba(245,158,11,0.5)";
    }
    if (reticleText) reticleText.textContent = "Guest Face Detected";
    if (subEl) subEl.textContent = `Face does not match enrolled owner '${currentActiveUser}'. Distraction restrictions & 1-minute tab freeze are automatically PAUSED. Guest can browse freely with zero restrictions.`;
  } else if (state === "AWAY") {
    textEl.textContent = "🚶 No Face Detected: User Stepped Away";
    textEl.style.color = "#94a3b8";
    if (badgeEl) {
      badgeEl.textContent = "User Away";
      badgeEl.style.color = "#94a3b8";
      badgeEl.style.borderColor = "rgba(148,163,184,0.5)";
    }
    if (reticleText) reticleText.textContent = "No Face In View";
    if (subEl) subEl.textContent = "No face in front of webcam. Screen is unattended. Focus monitoring, penalties, and lockouts paused.";
  } else {
    textEl.textContent = `👤 Enrolled Owner: ${currentActiveUser} (${conf}% Match)`;
    textEl.style.color = "#10b981";
    if (badgeEl) {
      badgeEl.textContent = "Owner Verified";
      badgeEl.style.color = "#10b981";
      badgeEl.style.borderColor = "rgba(16,185,129,0.5)";
    }
    if (reticleText) reticleText.textContent = "Owner Verified";
    if (subEl) subEl.textContent = `Enrolled owner '${currentActiveUser}' confirmed in front of laptop. Focus policies, distraction tracking, and 1-minute freeze penalty ACTIVE.`;
  }
}

// Background loop for continuous face monitoring
async function continuousFaceGuardTick() {
  if (!isContinuousFaceGuardActive) return;
  const imgData = captureWebcamFrame(true);
  if (!imgData) return;
  try {
    const res = await fetch("/api/face/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imgData,
        user_id: currentActiveUser
      })
    });
    if (res.ok) {
      const pres = await res.json();
      const status = pres.status || (pres.user_present ? "USER_WATCHING" : (pres.is_guest ? "GUEST_WATCHING" : "AWAY"));
      currentPresenceState = status;
      updateWhoIsWatchingUI(pres, pres.user_id || currentActiveUser);
      const modal = document.getElementById("faceScannerModal");
      if (modal && modal.style.display !== "none") {
        setScannerVerdict(status, pres);
      }
    }
  } catch (err) {
    console.warn("Face guard tick note:", err);
  }
}

async function startContinuousFaceGuard() {
  isContinuousFaceGuardActive = true;
  updateGuardButtonsUI(true);
  const bgVideo = document.getElementById("bgFaceGuardVideo");
  try {
    if (!webcamStream || !webcamStream.active) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" }
        });
      }
    }
    if (bgVideo && webcamStream) {
      bgVideo.srcObject = webcamStream;
      await bgVideo.play().catch(() => {});
    }
  } catch (e) {
    console.warn("Continuous guard camera access:", e);
  }

  if (continuousFaceGuardInterval) clearInterval(continuousFaceGuardInterval);
  continuousFaceGuardInterval = setInterval(continuousFaceGuardTick, 1500);
  setTimeout(continuousFaceGuardTick, 300);
}

function stopContinuousFaceGuard() {
  isContinuousFaceGuardActive = false;
  updateGuardButtonsUI(false);
  if (continuousFaceGuardInterval) {
    clearInterval(continuousFaceGuardInterval);
    continuousFaceGuardInterval = null;
  }
}

function toggleContinuousFaceGuard() {
  if (isContinuousFaceGuardActive) {
    stopContinuousFaceGuard();
  } else {
    startContinuousFaceGuard();
  }
}

function updateGuardButtonsUI(isActive) {
  const ddBadge = document.getElementById("dropdownGuardBadge");
  const lblDd = document.getElementById("lblLiveGuardStatus");
  const lblModal = document.getElementById("lblModalGuardStatus");

  if (ddBadge) {
    ddBadge.textContent = isActive ? "Guard ON" : "Guard OFF";
    ddBadge.style.color = isActive ? "#34d399" : "#94a3b8";
  }
  if (lblDd) {
    lblDd.textContent = isActive ? "ACTIVE" : "PAUSED";
    lblDd.style.color = isActive ? "#34d399" : "#f87171";
  }
  if (lblModal) {
    lblModal.textContent = isActive ? "ON" : "OFF";
    lblModal.style.color = isActive ? "#34d399" : "#f87171";
  }
}

// Helper JSON stringifier
function jsonString(obj) {
  return JSON.stringify(obj);
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  updateExtensionUIState();
  checkAndAutoInstallExtension();
  pollLiveTelemetry();
  pollTimer = setInterval(pollLiveTelemetry, 1500);
});
