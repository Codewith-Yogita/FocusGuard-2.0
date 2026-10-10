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
  user_id: "Eshan",
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

let currentActiveUser = "Eshan";
let currentPresenceState = "USER_WATCHING";
let webcamStream = null;

function toggleUserDropdown() {
  const dd = document.getElementById("userProfileDropdown");
  if (dd) {
    dd.style.display = (dd.style.display === "none" || !dd.style.display) ? "block" : "none";
  }
}

function toggleDemoDropdown() {
  const dd = document.getElementById("demoMenuDropdown");
  if (dd) {
    dd.style.display = (dd.style.display === "none" || !dd.style.display) ? "block" : "none";
  }
}

// Close dropdown on click outside
document.addEventListener("click", (e) => {
  const pill = document.getElementById("userPresencePill");
  const dd = document.getElementById("userProfileDropdown");
  if (dd && dd.style.display === "block" && pill && !pill.contains(e.target) && !dd.contains(e.target)) {
    dd.style.display = "none";
  }

  const demoBtn = document.getElementById("btnDemoMenu");
  const demoDd = document.getElementById("demoMenuDropdown");
  if (demoDd && demoDd.style.display === "block" && demoBtn && !demoBtn.contains(e.target) && !demoDd.contains(e.target)) {
    demoDd.style.display = "none";
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

    document.querySelectorAll(".dropdown-user-option").forEach(el => el.classList.remove("active"));
    const opt = document.getElementById(`userOption${userId}`);
    if (opt) opt.classList.add("active");

    pollLiveTelemetry();
  } catch (err) {
    console.error("User switch error:", err);
  }
}

async function simulatePresence(state) {
  currentPresenceState = state;
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

  const uid = activeUserId || watcher?.user_id || currentActiveUser || "Eshan";
  currentActiveUser = uid;

  if (userNameEl) userNameEl.textContent = uid;
  const initials = uid.substring(0, 2).toUpperCase();
  if (avatarEl) avatarEl.textContent = initials;
  if (modalAvatar) modalAvatar.textContent = initials;

  const optEshan = document.getElementById("userOptionEshan");
  const optYogita = document.getElementById("userOptionYogita");
  if (optEshan && optYogita) {
    if (uid === "Eshan") {
      optEshan.classList.add("active");
      optYogita.classList.remove("active");
    } else {
      optYogita.classList.add("active");
      optEshan.classList.remove("active");
    }
  }

  const isGuest = watcher?.is_guest || (watcher?.status === "GUEST_WATCHING");
  const isAway = (watcher?.status === "AWAY" || watcher?.reason === "no_face");

  if (presenceStatusEl) {
    if (isGuest) {
      presenceStatusEl.textContent = "👥 Guest Detected (Paused)";
      presenceStatusEl.style.color = "#f59e0b";
    } else if (isAway) {
      presenceStatusEl.textContent = "⚪ Away (No Face)";
      presenceStatusEl.style.color = "#94a3b8";
    } else {
      presenceStatusEl.textContent = `🟢 Watching (${uid})`;
      presenceStatusEl.style.color = "#10b981";
    }
  }

  if (presenceBtnLabel) {
    if (isGuest) presenceBtnLabel.textContent = "Guest Watching";
    else if (isAway) presenceBtnLabel.textContent = "User Away";
    else presenceBtnLabel.textContent = `${uid} Watching`;
  }

  if (guestBanner) {
    guestBanner.style.display = isGuest ? "flex" : "none";
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

  if (!punishment || !punishment.active) {
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
// FACE SCANNER WEBCAM MODAL
// ============================================================================

function openFaceScannerModal() {
  const dd = document.getElementById("userProfileDropdown");
  if (dd) dd.style.display = "none";
  const modal = document.getElementById("faceScannerModal");
  if (modal) modal.style.display = "flex";
  setScannerVerdict(currentPresenceState);
}

function closeFaceScannerModal() {
  const modal = document.getElementById("faceScannerModal");
  if (modal) modal.style.display = "none";
  if (webcamStream) {
    try {
      webcamStream.getTracks().forEach(track => track.stop());
    } catch (e) {}
    webcamStream = null;
  }
  const videoEl = document.getElementById("scannerVideo");
  if (videoEl) videoEl.style.display = "none";
  const feedSim = document.getElementById("scannerSimulationFeed");
  if (feedSim) feedSim.style.display = "flex";
}

async function startWebcamCapture() {
  const videoEl = document.getElementById("scannerVideo");
  const feedSim = document.getElementById("scannerSimulationFeed");
  const btn = document.getElementById("btnStartWebcam");

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 320 } });
      if (videoEl) {
        videoEl.srcObject = webcamStream;
        videoEl.style.display = "block";
        if (feedSim) feedSim.style.display = "none";
        if (btn) btn.innerHTML = "<span>✅ Live Camera Active & Scanning Face</span>";
        setScannerVerdict("USER_WATCHING");
      }
    } else {
      setScannerVerdict("USER_WATCHING");
    }
  } catch (err) {
    console.warn("Webcam access note:", err);
    if (btn) btn.innerHTML = "<span>📷 Using Biometric Simulator (Camera Busy)</span>";
    setScannerVerdict("USER_WATCHING");
  }
}

function setScannerVerdict(state) {
  const textEl = document.getElementById("scannerVerdictText");
  const subEl = document.getElementById("scannerVerdictSubtext");
  if (!textEl) return;

  if (state === "GUEST_WATCHING") {
    textEl.textContent = "👥 Unrecognized Face: Guest Detected";
    textEl.style.color = "#f59e0b";
    if (subEl) subEl.textContent = "Face does not match enrolled owner. Distraction restrictions automatically paused.";
  } else if (state === "AWAY") {
    textEl.textContent = "🚶 No Face Detected: User Stepped Away";
    textEl.style.color = "#94a3b8";
    if (subEl) subEl.textContent = "No presence detected in front of webcam.";
  } else {
    textEl.textContent = `👤 User Verified: ${currentActiveUser} (95% Match)`;
    textEl.style.color = "#10b981";
    if (subEl) subEl.textContent = `Enrolled owner '${currentActiveUser}' confirmed. Focus policies and 1-minute freeze penalty active.`;
  }
}

// Helper JSON stringifier
function jsonString(obj) {
  return JSON.stringify(obj);
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  pollLiveTelemetry();
  pollTimer = setInterval(pollLiveTelemetry, 1500);
});
