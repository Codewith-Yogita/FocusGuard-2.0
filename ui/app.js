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
}

async function startFocusSession() {
  const goalText = document.getElementById("goalTextInput").value.trim() || "Focus Session";
  const duration = parseInt(document.getElementById("durationSelect").value, 10) || 25;

  try {
    const res = await fetch("/api/v2/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString({
        category: selectedCategory,
        goal_text: goalText,
        duration_minutes: duration
      })
    });
    const data = await res.json();
    if (data.success) {
      pollLiveTelemetry();
    }
  } catch (err) {
    console.error("Failed to start focus session:", err);
  }
}

async function stopFocusSession() {
  try {
    await fetch("/api/v2/session/stop", { method: "POST" });
    document.getElementById("activeFocusCard").style.display = "none";
    document.getElementById("intentOnboardingCard").style.display = "block";
    document.getElementById("interventionCardContainer").style.display = "none";
  } catch (err) {
    console.error("Failed to stop session:", err);
  }
}

// ============================================================================
// REAL-TIME TELEMETRY & DRIFT POLLING
// ============================================================================

async function pollLiveTelemetry() {
  try {
    const res = await fetch("/api/v2/telemetry/live");
    if (!res.ok) return;
    const data = await res.json();

    updateSessionUI(data.session, data.intent);
    updateCurrentActivityUI(data.current_activity, data.drift);
    updateRiskUI(data.risk, data.switches_last_5m);
    updateInterventionPromptUI(data.recommendation, data.active_prompt);
    updateDriftDiagnosticsUI(data.drift, data.risk);
    updateTelemetrySourceBadge(data.session.is_simulated_mode, data.current_activity.source);

  } catch (err) {
    console.warn("Telemetry poll error:", err);
  }
}

function updateSessionUI(session, intent) {
  const onboarding = document.getElementById("intentOnboardingCard");
  const activeCard = document.getElementById("activeFocusCard");
  const timerDisplay = document.getElementById("sessionTimerDisplay");
  const goalHeading = document.getElementById("activeGoalHeading");
  const catLabel = document.getElementById("intentCategoryLabel");

  if (!session || session.status === "IDLE") {
    onboarding.style.display = "block";
    activeCard.style.display = "none";
    return;
  }

  onboarding.style.display = "none";
  activeCard.style.display = "block";

  if (intent) {
    goalHeading.textContent = intent.goal_text || "Focus Session";
    catLabel.textContent = intent.category_label || "Active Goal";
  }

  // Timer format (MM:SS)
  const rem = session.remaining_seconds || 0;
  const m = Math.floor(rem / 60).toString().padStart(2, "0");
  const s = (rem % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${m}:${s}`;
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

  container.style.display = "block";
  currentInterventionId = prompt.intervention_id || "int_live";
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
    btn.onclick = () => handleInterventionAction(currentInterventionId, action.id);
    actionsEl.appendChild(btn);
  });
}

async function handleInterventionAction(interventionId, actionId) {
  try {
    const res = await fetch("/api/v2/intervention/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString({ intervention_id: interventionId, action_id: actionId })
    });
    const data = await res.json();

    document.getElementById("interventionCardContainer").style.display = "none";

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
  try {
    const res = await fetch("/api/v2/simulator/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString({ step: stepNum })
    });
    const data = await res.json();

    // Visual button active highlight
    document.querySelectorAll(".demo-step-btn").forEach((b, i) => {
      if (i + 1 === stepNum) b.classList.add("active");
      else b.classList.remove("active");
    });

    // Immediate poll
    pollLiveTelemetry();
  } catch (err) {
    console.error("Simulator step error:", err);
  }
}

async function resetSimulator() {
  try {
    await fetch("/api/v2/simulator/reset", { method: "POST" });
    document.querySelectorAll(".demo-step-btn").forEach(b => b.classList.remove("active"));
    pollLiveTelemetry();
  } catch (err) {
    console.error("Simulator reset error:", err);
  }
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

  // Step 2: Coding IDE (8s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(2);
  }, 7000);

  // Step 3: YouTube Shorts (Mild Drift) (15s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(3);
  }, 14000);

  // Step 4: Instagram Reels (Moderate Drift + AI Suggestion) (22s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(4);
  }, 22000);

  // Step 5: Repeated Diversion (30s)
  autoDemoTimer = setTimeout(() => {
    triggerSimulatorStep(5);
  }, 30000);

  // Step 6: User accepts Breath Reset (38s)
  autoDemoTimer = setTimeout(() => {
    handleInterventionAction("int_demo_auto", "BREATH_RESET");
  }, 38000);
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
