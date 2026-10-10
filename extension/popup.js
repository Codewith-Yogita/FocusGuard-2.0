/**
 * Focus Guard 2.0 - Extension Popup Controller
 * Connects directly to http://127.0.0.1:8000/api/v2/telemetry/live
 */

const SERVER_URL = "http://127.0.0.1:8000";

async function fetchStatus() {
  const connEl = document.getElementById("conn-indicator");
  const sessEl = document.getElementById("session-status");
  const riskEl = document.getElementById("risk-score");
  const driftEl = document.getElementById("drift-state");
  const goalEl = document.getElementById("goal-text");

  try {
    const res = await fetch(`${SERVER_URL}/api/v2/telemetry/live`);
    if (!res.ok) throw new Error("Offline");
    const data = await res.json();

    connEl.textContent = "Online";
    connEl.style.color = "#10b981";

    // Who's Watching
    const watchingEl = document.getElementById("watching-status");
    if (watchingEl && data.who_is_watching) {
      const w = data.who_is_watching;
      if (w.owner_enrolled === false || w.status === "NOT_ENROLLED") {
        watchingEl.textContent = "⚪ Not Enrolled (Guest Mode)";
        watchingEl.className = "val";
      } else if (w.is_guest) {
        watchingEl.textContent = "👥 Guest Detected (Paused)";
        watchingEl.className = "val val-warn";
      } else if (w.status === "AWAY") {
        watchingEl.textContent = `⚪ ${w.enrolled_owner || w.user_id || "Owner"} Away (Paused)`;
        watchingEl.className = "val";
      } else {
        watchingEl.textContent = `👤 ${w.enrolled_owner || w.user_id || "Owner"} (Watching)`;
        watchingEl.className = "val val-good";
      }
    }

    // Freeze Penalty Row
    const freezeRow = document.getElementById("freeze-row");
    const freezeStatus = document.getElementById("freeze-status");
    if (freezeRow && freezeStatus && data.freeze_punishment) {
      if (data.freeze_punishment.active) {
        freezeRow.style.display = "flex";
        const rem = data.freeze_punishment.remaining_seconds || 60;
        const m = Math.floor(rem / 60).toString().padStart(2, "0");
        const s = (rem % 60).toString().padStart(2, "0");
        freezeStatus.textContent = `${m}:${s} Active`;
      } else {
        freezeRow.style.display = "none";
      }
    }

    // Intent
    if (data.intent) {
      goalEl.textContent = `${data.intent.category_label || "Goal"}: "${data.intent.goal_text}"`;
    } else {
      goalEl.textContent = "No active intention declared.";
    }

    // Session status
    const status = data.session?.status || "IDLE";
    sessEl.textContent = status;
    if (status === "ACTIVE") {
      sessEl.className = "val val-good";
    } else if (status === "RESET_ACTIVITY") {
      sessEl.className = "val val-warn";
      sessEl.textContent = "BREATH RESET";
    } else {
      sessEl.className = "val";
    }

    // Risk
    const rScore = data.risk?.score || 0;
    const rLvl = data.risk?.level || 0;
    riskEl.textContent = `${rScore}% (Level ${rLvl})`;
    if (rScore < 25) {
      riskEl.className = "val val-good";
    } else if (rScore < 75) {
      riskEl.className = "val val-warn";
    } else {
      riskEl.className = "val val-urgent";
    }

    // Drift state
    const dState = data.drift?.drift_state || "NOMINAL";
    driftEl.textContent = dState.replace("_", " ");
    if (dState === "NOMINAL") {
      driftEl.className = "val val-good";
    } else if (dState === "MILD_DRIFT") {
      driftEl.className = "val val-warn";
    } else {
      driftEl.className = "val val-urgent";
    }

  } catch (err) {
    connEl.textContent = "Server Offline";
    connEl.style.color = "#94a3b8";
    goalEl.textContent = "Ensure 'python ui/server.py 8000' is running.";
  }
}

document.getElementById("freeze-demo-btn")?.addEventListener("click", async () => {
  try {
    await fetch(`${SERVER_URL}/api/v2/punishment/freeze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_name: "Instagram / Shorts / Texting",
        reason: "Excessive distraction detected (Instagram Reels / YouTube Shorts / Social texting). 1-Minute Tab Freeze Penalty enforced.",
        duration_seconds: 60
      })
    });
    fetchStatus();
  } catch {}
});

document.getElementById("breath-reset-btn")?.addEventListener("click", async () => {
  try {
    await fetch(`${SERVER_URL}/api/v2/intervention/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervention_id: "int_popup", action_id: "BREATH_RESET" })
    });
    fetchStatus();
    chrome.tabs.create({ url: `${SERVER_URL}` });
  } catch {}
});

document.getElementById("pause-break-btn")?.addEventListener("click", async () => {
  try {
    await fetch(`${SERVER_URL}/api/v2/intervention/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervention_id: "int_popup", action_id: "SHORT_BREAK" })
    });
    fetchStatus();
  } catch {}
});

document.getElementById("open-dashboard-btn")?.addEventListener("click", () => {
  chrome.tabs.create({ url: `${SERVER_URL}` });
});

fetchStatus();
setInterval(fetchStatus, 2000);
