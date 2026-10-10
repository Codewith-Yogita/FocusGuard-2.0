/**
 * Focus Guard 2.0 Chrome Extension - In-Page Content Script
 * 
 * Provides Adaptive Digital-Wellbeing Interventions directly OVER the screen of distracting apps:
 * - Level 1: Gentle in-page floating awareness banner
 * - Level 2 / Level 3: AI Contextual Intervention Modal directly centered over distracting feeds
 * - Level 3: Interactive In-Page 3-Minute Breath Reset Screen with pulsating breathing orb
 * - Level 4: Focus Lock Restriction Shield (Window minimization / DOM shield)
 */

(function () {
  // Never inject HUD or blocker into FocusGuard dashboard or local servers
  const host = window.location.hostname;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.includes("vercel.app") ||
    host.includes("focusguard")
  ) {
    return;
  }

  // State Management
  let streakSeconds = 0;
  let isOverlayActive = false;
  let goalPausedUntil = 0;
  let lastCheckedHref = "";
  let isPageProductive = false;
  let activeInterventionLevel = 0;
  let lastPromptId = null;
  let breathInterval = null;
  let breathSecondsRemaining = 180;
  let domLockoutInterval = null;
  let freezeInterval = null;
  let freezeRemainingSeconds = 60;

  let currentSession = {
    status: "IDLE",
    intent: null,
    risk: { score: 0, level: 0 },
    drift: { drift_state: "NOMINAL", streak_seconds: 0 }
  };

  const SERVER_URLS = [
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8765",
    "https://focus-guard-snowy.vercel.app",
    "https://focusguard-bice.vercel.app"
  ];
  let activeServerUrl = "http://127.0.0.1:8000";

  // =========================================================================
  // STYLES INJECTION (ISOLATED IN-PAGE CSS)
  // =========================================================================

  function ensureInPageStyles() {
    if (document.getElementById("fg-2-injected-styles")) return;
    const style = document.createElement("style");
    style.id = "fg-2-injected-styles";
    style.textContent = `
      @keyframes fgFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes fgSlideDown {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes fgBreatheOrb {
        0%, 100% {
          transform: scale(0.85);
          box-shadow: 0 0 35px rgba(56, 189, 248, 0.4), inset 0 0 20px rgba(99, 102, 241, 0.3);
        }
        50% {
          transform: scale(1.35);
          box-shadow: 0 0 85px rgba(99, 102, 241, 0.8), inset 0 0 40px rgba(56, 189, 248, 0.5);
        }
      }
      .fg-inpage-element {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif !important;
        box-sizing: border-box !important;
        user-select: none !important;
      }
      .fg-inpage-element * {
        box-sizing: border-box !important;
      }
      .fg-btn {
        cursor: pointer !important;
        border: none !important;
        outline: none !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        border-radius: 10px !important;
        padding: 9px 16px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        transition: all 0.2s ease !important;
        text-decoration: none !important;
      }
      .fg-btn:hover {
        transform: translateY(-1px) !important;
      }
      .fg-btn-primary {
        background: linear-gradient(135deg, #6366f1, #4f46e5) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4) !important;
      }
      .fg-btn-primary:hover {
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6) !important;
      }
      .fg-btn-calm {
        background: linear-gradient(135deg, #0284c7, #0369a1) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 15px rgba(2, 132, 199, 0.35) !important;
      }
      .fg-btn-secondary {
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        color: #e2e8f0 !important;
      }
      .fg-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.14) !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // =========================================================================
  // NETWORK REQUEST RELAY
  // =========================================================================

  async function fetchFromAnyServer(path, options = {}) {
    // 1. Try background relay first (bypasses HTTPS mixed-content & CORS)
    try {
      if (chrome.runtime?.sendMessage) {
        const bgRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "FETCH_API", path, options }, (response) => {
            if (chrome.runtime.lastError || !response) {
              resolve(null);
            } else {
              resolve(response);
            }
          });
        });
        if (bgRes && bgRes.success && bgRes.data) {
          return {
            ok: true,
            status: bgRes.status || 200,
            json: async () => bgRes.data
          };
        }
      }
    } catch {}

    // 2. Direct fetch fallback
    for (const url of SERVER_URLS) {
      try {
        const res = await fetch(`${url}${path}`, options);
        if (res.ok) {
          activeServerUrl = url;
          return res;
        }
      } catch {}
    }
    return null;
  }

  function isGoalPaused() {
    return Date.now() < goalPausedUntil;
  }

  function getTargetGoalDestination() {
    if (currentSession.intent?.target_url) {
      return {
        url: currentSession.intent.target_url,
        label: currentSession.intent.target_label || "Goal Workspace"
      };
    }
    const g = (currentSession.intent?.goal_text || "").toLowerCase();
    if (g.includes("leetcode")) {
      return { url: "https://leetcode.com/problemset/all/", label: "LeetCode Practice" };
    }
    if (g.includes("dsa") || g.includes("tree") || g.includes("graph") || g.includes("algorithm")) {
      return { url: "https://www.youtube.com/results?search_query=dsa+trees+lecture+striver", label: "Striver DSA Trees Lecture" };
    }
    return { url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/", label: "Striver A2Z DSA Sheet" };
  }

  // =========================================================================
  // DISTRACTION CLASSIFICATION (CONTEXT-AWARE)
  // =========================================================================

  function isDistractionSite(href, title) {
    const url = (href || window.location.href || "").toLowerCase();
    const host = (window.location.hostname || "").toLowerCase();
    const t = (title || document.title || "").toLowerCase();

    // 1. YouTube Shorts is strictly non-productive distraction
    if (url.includes("/shorts") || window.location.pathname.includes("/shorts")) {
      return true;
    }

    // 2. High-distraction social, entertainment & messaging domains
    const defaultDistractions = [
      "instagram.com", "snapchat.com", "tiktok.com", "reddit.com",
      "twitter.com", "x.com", "facebook.com", "netflix.com",
      "twitch.tv", "pinterest.com", "discord.com",
      "web.whatsapp.com", "web.telegram.org", "messenger.com", "messages.google.com"
    ];
    if (defaultDistractions.some(d => host.includes(d) || url.includes(d))) {
      return true;
    }

    // 3. YouTube nuance:
    if (host.includes("youtube.com")) {
      const dsaTerms = [
        "dsa", "data structure", "algorithm", "leetcode", "striver",
        "tree", "graph", "dp", "binary search", "sorting", "recursion",
        "lecture", "course", "tutorial", "learn", "study", "code",
        "programming", "cpp", "c++", "python", "java", "javascript", "react", "math", "exam"
      ];
      if (dsaTerms.some(term => t.includes(term))) {
        return false; // Educational video is ALIGNED!
      }
      if (t.includes("lofi") || t.includes("study beats") || t.includes("chillhop") || t.includes("ambient study")) {
        return false; // Background music is permitted
      }
      return true; // General entertainment YouTube
    }

    return false;
  }

  // Media Playback & Scroll Helpers
  function stopVideos() {
    document.querySelectorAll("video, audio").forEach(media => {
      try { media.pause(); } catch (e) {}
    });
  }

  function lockScroll() {
    document.documentElement.style.setProperty("overflow", "hidden", "important");
    document.body.style.setProperty("overflow", "hidden", "important");
    window.addEventListener("wheel", blockEvent, { passive: false });
    window.addEventListener("touchmove", blockEvent, { passive: false });
    window.addEventListener("keydown", blockScrollKeys, { passive: false });
  }

  function unlockScroll() {
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
    window.removeEventListener("wheel", blockEvent);
    window.removeEventListener("touchmove", blockEvent);
    window.removeEventListener("keydown", blockScrollKeys);
  }

  function blockEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  function blockScrollKeys(e) {
    if (["Space", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.code)) {
      if (e.target && e.target.id !== "fg-pin-input") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }

  // =========================================================================
  // LEVEL 1: IN-PAGE FLOATING AWARENESS BANNER (GENTLE NUDGE)
  // =========================================================================

  function showInPageAwarenessBanner(goalText, appLabel, seconds, customUrl, customLabel) {
    ensureInPageStyles();
    let banner = document.getElementById("focusguard-inpage-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "focusguard-inpage-banner";
      banner.className = "fg-inpage-element";
      banner.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483640;
        max-width: 680px;
        width: 92%;
        padding: 12px 20px;
        border-radius: 16px;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        background: rgba(15, 23, 42, 0.94);
        border: 2px solid rgba(245, 158, 11, 0.6);
        color: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        animation: fgSlideDown 0.35s ease;
      `;
      document.body.appendChild(banner);
    }

    const target = getTargetGoalDestination();
    const destUrl = customUrl || target.url;
    const destLabel = customLabel || target.label;
    const goalDisplay = goalText || (currentSession.intent ? currentSession.intent.goal_text : "your declared focus goal");
    const timeDisplay = seconds >= 60 ? `${Math.floor(seconds / 60)}m` : `${seconds}s`;

    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:22px;">💡</span>
        <div>
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#f59e0b;">
            Gentle Awareness — Focus Guard 2.0
          </div>
          <div style="font-size:13px; font-weight:600; color:#f1f5f9; margin-top:2px;">
            Still on track for "<strong>${goalDisplay}</strong>"?
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-top:1px;">
            Observed ${appLabel} activity for ${timeDisplay}.
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
        <button id="fg-banner-return-btn" class="fg-btn fg-btn-primary" style="padding: 8px 14px !important; font-size: 12px !important;">
          <span>🚀 Launch ${destLabel}</span>
        </button>
        <button id="fg-banner-dismiss-btn" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
          padding: 4px 6px;
        ">✕</button>
      </div>
    `;

    document.getElementById("fg-banner-return-btn")?.addEventListener("click", () => {
      handleActionReturnToGoal(destUrl, destLabel);
    });
    document.getElementById("fg-banner-dismiss-btn")?.addEventListener("click", () => {
      banner.remove();
      // Dismiss for 60 seconds
      goalPausedUntil = Date.now() + 60000;
    });
  }

  // =========================================================================
  // LEVEL 2 / LEVEL 3: IN-PAGE AI ADAPTIVE INTERVENTION MODAL
  // =========================================================================

  function showInPageInterventionModal(promptData) {
    ensureInPageStyles();
    // Stop videos on the distracting tab so they don't keep playing
    stopVideos();

    let overlay = document.getElementById("focusguard-inpage-modal-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "focusguard-inpage-modal-overlay";
      overlay.className = "fg-inpage-element";
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        background: rgba(8, 12, 22, 0.88);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fgFadeIn 0.3s ease;
      `;
      document.body.appendChild(overlay);
    }

    const target = getTargetGoalDestination();
    const destUrl = promptData.target_url || target.url;
    const destLabel = promptData.target_label || target.label;

    const title = promptData.headline || "Mind Mirror: Drifting from Goal";
    const message = promptData.message || "Deep down you know this distraction won't help you achieve your goal. Let's switch right now.";
    const rationale = promptData.rationale || "Observed activity diverges from declared focus goal.";
    const tier = promptData.tier_level || 2;
    const riskScore = promptData.risk_score || 60;
    const goalText = promptData.goal_text || (currentSession.intent ? currentSession.intent.goal_text : "Focus Session");

    const badgeLabel = tier === 3 ? "LEVEL 3 — FOCUS RESET RECOMMENDED" : "LEVEL 2 — AI INNER CONSCIENCE CHECK";
    const badgeColor = tier === 3 ? "#ec4899" : "#8b5cf6";

    overlay.innerHTML = `
      <div style="
        background: #0f172a;
        border: 1px solid rgba(139, 92, 246, 0.35);
        border-radius: 22px;
        max-width: 560px;
        width: 100%;
        padding: 28px 28px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(99,102,241,0.25);
        color: #f8fafc;
        text-align: left;
      ">
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <div style="
            display:inline-flex;
            align-items:center;
            gap:6px;
            font-size:11px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:1px;
            color:${badgeColor};
            background:rgba(139,92,246,0.12);
            padding:5px 12px;
            border-radius:999px;
            border:1px solid rgba(139,92,246,0.25);
          ">
            <span>🧠</span>
            <span>${badgeLabel}</span>
          </div>
          <span style="font-family:monospace; font-size:11px; color:#94a3b8;">
            RISK: <strong style="color:#f43f5e;">${riskScore}%</strong>
          </span>
        </div>

        <!-- Headline & Message -->
        <h2 style="font-size:20px; font-weight:700; color:#ffffff; margin:0 0 8px 0; letter-spacing:-0.01em;">
          ${title}
        </h2>
        <p style="font-size:14px; color:#cbd5e1; line-height:1.55; margin:0 0 12px 0;">
          ${message}
        </p>
        <div style="
          background: rgba(0,0,0,0.35);
          border-left: 3px solid #8b5cf6;
          padding: 9px 14px;
          border-radius: 8px;
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 18px;
        ">
          🎯 <strong>Target Goal:</strong> "${goalText}"<br>
          🚀 <strong>Productive Resource:</strong> <span style="color:#38bdf8;">${destLabel}</span><br>
          <em>${rationale}</em>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; flex-direction:column; gap:9px;">
          <!-- Primary Teleport Button -->
          <button id="fg-modal-return-btn" class="fg-btn fg-btn-primary" style="justify-content:center; padding:12px !important; font-size:14px !important;">
            <span>🚀 Launch ${destLabel} Now</span>
          </button>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:9px;">
            <button id="fg-modal-breath-btn" class="fg-btn fg-btn-secondary" style="justify-content:center;">
              <span>🧘 3-Min Breath Reset</span>
            </button>
            <button id="fg-modal-break-btn" class="fg-btn fg-btn-secondary" style="justify-content:center;">
              <span>⏸️ 5-Min Planned Break</span>
            </button>
          </div>

          <button id="fg-modal-dismiss-btn" style="
            background:transparent;
            border:none;
            color:#64748b;
            font-size:12px;
            cursor:pointer;
            padding:6px;
            text-align:center;
            margin-top:2px;
          ">Dismiss (Snooze for 60s)</button>
        </div>
      </div>
    `;

    document.getElementById("fg-modal-return-btn")?.addEventListener("click", () => {
      handleActionReturnToGoal(destUrl, destLabel);
    });

    document.getElementById("fg-modal-breath-btn")?.addEventListener("click", () => {
      overlay.remove();
      showInPageBreathReset();
    });

    document.getElementById("fg-modal-break-btn")?.addEventListener("click", () => {
      handleActionShortBreak();
    });

    document.getElementById("fg-modal-dismiss-btn")?.addEventListener("click", () => {
      handleActionDismiss();
    });
  }

  // =========================================================================
  // LEVEL 3: IN-PAGE GUIDED 3-MINUTE BREATH RESET SCREEN
  // =========================================================================

  function showInPageBreathReset() {
    ensureInPageStyles();
    stopVideos();
    lockScroll();

    let overlay = document.getElementById("focusguard-inpage-breath-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "focusguard-inpage-breath-overlay";
      overlay.className = "fg-inpage-element";
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: rgba(7, 9, 14, 0.94);
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
        color: #f8fafc;
        animation: fgFadeIn 0.4s ease;
      `;
      document.body.appendChild(overlay);
    }

    breathSecondsRemaining = 180;

    overlay.innerHTML = `
      <div style="max-width: 440px; width: 100%; margin: 0 auto;">
        <div style="
          display:inline-block;
          font-size: 11px;
          font-weight: 700;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
          padding: 5px 14px;
          border-radius: 999px;
          margin-bottom: 12px;
        ">
          Mindfulness Reset
        </div>
        <h2 style="font-size: 26px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.02em;">
          3-Minute Breath Reset
        </h2>
        <p style="font-size: 13px; color: #94a3b8; margin: 6px 0 24px 0;">
          Center your attention before returning to your declared focus goal.
        </p>

        <!-- Pulsating Breathing Orb -->
        <div style="
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto 24px;
          display: grid;
          place-items: center;
        ">
          <div style="
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: radial-gradient(circle, #38bdf8, #6366f1);
            animation: fgBreatheOrb 8s infinite ease-in-out;
          "></div>
        </div>

        <div id="fg-inpage-breath-instr" style="
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          min-height: 28px;
          margin-bottom: 6px;
        ">Breathe in deeply...</div>

        <div id="fg-inpage-breath-timer" style="
          font-family: monospace;
          font-size: 32px;
          font-weight: 700;
          color: #a5b4fc;
          margin-bottom: 24px;
        ">03:00</div>

        <button id="fg-inpage-breath-complete-btn" class="fg-btn fg-btn-calm" style="
          padding: 12px 24px !important;
          font-size: 14px !important;
          margin: 0 auto;
        ">
          <span>Complete Reset & Return to Focus</span>
        </button>
      </div>
    `;

    const instrEl = document.getElementById("fg-inpage-breath-instr");
    const timerEl = document.getElementById("fg-inpage-breath-timer");

    clearInterval(breathInterval);
    breathInterval = setInterval(() => {
      breathSecondsRemaining--;
      const m = Math.floor(breathSecondsRemaining / 60).toString().padStart(2, "0");
      const s = (breathSecondsRemaining % 60).toString().padStart(2, "0");
      if (timerEl) timerEl.textContent = `${m}:${s}`;

      // 8-second breathing rhythm (4s in, 4s out)
      const cycle = breathSecondsRemaining % 8;
      if (cycle >= 4) {
        if (instrEl) instrEl.textContent = "Breathe in deeply...";
      } else {
        if (instrEl) instrEl.textContent = "Breathe out gently...";
      }

      if (breathSecondsRemaining <= 0) {
        finishBreathReset();
      }
    }, 1000);

    document.getElementById("fg-inpage-breath-complete-btn")?.addEventListener("click", () => {
      finishBreathReset();
    });
  }

  function finishBreathReset() {
    clearInterval(breathInterval);
    document.getElementById("focusguard-inpage-breath-overlay")?.remove();
    unlockScroll();

    // Notify backend of completion
    fetchFromAnyServer("/api/v2/intervention/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervention_id: "int_inpage", action_id: "BREATH_RESET" })
    }).catch(() => {});

    // Grant 3-minute grace immunity
    goalPausedUntil = Date.now() + (3 * 60 * 1000);
    streakSeconds = 0;
    isPageProductive = true;

    showToast("✨ Mind centered! 3-minute grace period active. Close this tab to stay in flow.");
  }

  // =========================================================================
  // 1-MINUTE TAB FREEZE PUNISHMENT (EXCESS DISTRACTION LOCKOUT)
  // =========================================================================

  function showInPageFreezePunishment(reasonText, secondsLeft = 60) {
    ensureInPageStyles();
    stopVideos();
    lockScroll();
    isOverlayActive = true;

    // Dismiss softer prompts
    document.getElementById("focusguard-inpage-banner")?.remove();
    document.getElementById("focusguard-inpage-modal-overlay")?.remove();
    document.getElementById("focusguard-inpage-breath-overlay")?.remove();
    document.getElementById("focusguard-dom-blocked-overlay")?.remove();

    if (document.getElementById("focusguard-tab-freeze-overlay")) {
      return; // Already active and counting down
    }

    freezeRemainingSeconds = secondsLeft > 0 ? secondsLeft : 60;

    const overlay = document.createElement("div");
    overlay.id = "focusguard-tab-freeze-overlay";
    overlay.className = "fg-inpage-element";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: radial-gradient(circle at 50% 30%, rgba(14, 165, 233, 0.25), rgba(3, 7, 18, 0.97) 70%);
      backdrop-filter: blur(32px) saturate(180%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fgFadeIn 0.35s ease;
      cursor: not-allowed;
    `;

    overlay.innerHTML = `
      <div style="
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid rgba(56, 189, 248, 0.7);
        border-radius: 28px;
        max-width: 520px;
        width: 100%;
        padding: 34px 30px;
        text-align: center;
        box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(56, 189, 248, 0.35);
        color: #f8fafc;
        position: relative;
        overflow: hidden;
      ">
        <!-- Ice frost sheen decoration -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #38bdf8, #818cf8, #38bdf8);
        "></div>

        <div style="
          width: 64px;
          height: 64px;
          margin: 0 auto 14px;
          border-radius: 22px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 0 25px rgba(56, 189, 248, 0.3);
        ">🥶</div>

        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(56, 189, 248, 0.15); border:1px solid rgba(56, 189, 248, 0.4); color:#38bdf8; border-radius:999px; padding:4px 14px; font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:10px;">
          <span>❄️ 1-Minute Tab Freeze Penalty</span>
        </div>

        <h2 style="font-size: 24px; font-weight: 800; margin: 4px 0 10px; color: #ffffff; letter-spacing:-0.02em;">
          Tab Completely Frozen
        </h2>

        <p style="font-size: 13.5px; color: #94a3b8; line-height: 1.55; margin-bottom: 20px;">
          ${reasonText || "Excessive digital distraction detected (Instagram / YouTube Shorts / Unnecessary texting). As an active penalty, you cannot use this tab for 1 minute."}
        </p>

        <!-- Prominent Freeze Countdown Timer -->
        <div style="
          background: rgba(2, 6, 23, 0.75);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 18px;
          padding: 16px 20px;
          margin-bottom: 22px;
        ">
          <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
            Freeze Penalty Remaining
          </div>
          <div id="fg-freeze-countdown" style="
            font-size: 42px;
            font-weight: 800;
            color: #38bdf8;
            font-family: monospace;
            letter-spacing: 2px;
            text-shadow: 0 0 25px rgba(56, 189, 248, 0.5);
          ">
            01:00
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
            Tab will automatically unfreeze when the timer reaches zero
          </div>
        </div>

        <!-- Allowed Action: Teleport Back to Goal -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button id="fg-freeze-teleport-btn" class="fg-btn fg-btn-primary" style="justify-content:center; padding:13px !important; font-size:13.5px !important; background:linear-gradient(135deg, #0284c7, #2563eb) !important; box-shadow:0 4px 20px rgba(2, 132, 199, 0.45) !important;">
            <span>🚀 Teleport to Goal Workspace (Resume Focus)</span>
          </button>
          <div style="font-size:11.5px; color:#64748b;">
            Returning to your focus goal clears your penalty immediately.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("fg-freeze-teleport-btn")?.addEventListener("click", () => {
      const target = getTargetGoalDestination();
      handleActionReturnToGoal(target.url, target.label);
    });

    if (freezeInterval) clearInterval(freezeInterval);
    freezeInterval = setInterval(() => {
      freezeRemainingSeconds--;
      const timerEl = document.getElementById("fg-freeze-countdown");
      if (timerEl) {
        const m = Math.floor(freezeRemainingSeconds / 60).toString().padStart(2, "0");
        const s = (freezeRemainingSeconds % 60).toString().padStart(2, "0");
        timerEl.textContent = `${m}:${s}`;
      }
      stopVideos();

      if (freezeRemainingSeconds <= 0) {
        clearInterval(freezeInterval);
        document.getElementById("focusguard-tab-freeze-overlay")?.remove();
        unlockScroll();
        isOverlayActive = false;
        goalPausedUntil = Date.now() + 30000; // 30s grace period
        showToast("🔓 1-Minute Tab Freeze Penalty lifted! Please return to your focus goal.");
      }
    }, 1000);
  }

  // =========================================================================
  // LEVEL 4: IN-PAGE RESTRICTION SHIELD (FOCUS LOCKDOWN)
  // =========================================================================

  function showInPageRestrictionShield() {
    ensureInPageStyles();
    stopVideos();
    lockScroll();
    isOverlayActive = true;

    // Dismiss softer prompts
    document.getElementById("focusguard-inpage-banner")?.remove();
    document.getElementById("focusguard-inpage-modal-overlay")?.remove();

    if (document.getElementById("focusguard-dom-blocked-overlay")) return;

    let lockoutRemainingSeconds = 1200; // 20 minutes

    const overlay = document.createElement("div");
    overlay.id = "focusguard-dom-blocked-overlay";
    overlay.className = "fg-inpage-element";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: rgba(8, 14, 26, 0.94);
      backdrop-filter: blur(28px) saturate(160%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fgFadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background: #0f172a;
        border: 2px solid rgba(244, 63, 94, 0.5);
        border-radius: 24px;
        max-width: 520px;
        width: 100%;
        padding: 32px 28px;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(244,63,94,0.3);
        color: #f8fafc;
      ">
        <div style="
          width: 56px;
          height: 56px;
          margin: 0 auto 12px;
          border-radius: 18px;
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
        ">🛑</div>

        <div style="font-size: 11px; font-weight: 800; color: #f43f5e; text-transform: uppercase; letter-spacing: 2px;">
          Level 4 — Restriction Active
        </div>
        <h2 style="font-size: 22px; font-weight: 800; margin: 6px 0 8px; color: #ffffff;">
          Focus Lock Engaged
        </h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 16px;">
          Suggestions were dismissed. Non-essential video and social feeds are temporarily restricted to help you regain control.
        </p>

        <!-- Lockout Timer -->
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.4);
          color: #fda4af;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          font-family: monospace;
          margin-bottom: 20px;
        ">
          ⏳ Lock Duration: <span id="fg-inpage-lock-timer">20:00</span>
        </div>

        <!-- Quick Recovery Actions -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button id="fg-lock-teleport-btn" class="fg-btn fg-btn-primary" style="justify-content:center; padding:12px !important; font-size:13px !important;">
            <span>🚀 Teleport to Goal Workspace Now</span>
          </button>

          <button id="fg-lock-breath-btn" class="fg-btn fg-btn-secondary" style="justify-content:center; padding:10px !important;">
            <span>🧘 Take 3-Min Reset to Unlock</span>
          </button>

          <!-- PIN Unlock Fallback -->
          <div style="display:flex; gap:8px; margin-top:4px;">
            <input type="password" id="fg-pin-input" placeholder="Security PIN (Default: 1234)" style="
              flex: 1;
              background: rgba(0,0,0,0.4);
              border: 1px solid rgba(255,255,255,0.15);
              border-radius: 10px;
              padding: 9px 12px;
              color: #fff;
              font-size: 13px;
              outline: none;
            ">
            <button id="fg-pin-unlock-btn" class="fg-btn fg-btn-secondary">
              <span>Unlock</span>
            </button>
          </div>

          <button id="fg-lock-close-btn" class="fg-btn fg-btn-secondary" style="justify-content:center; margin-top:2px;">
            <span>✕ Close Distracting Tab</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById("fg-lock-teleport-btn")?.addEventListener("click", () => {
      const target = getTargetGoalDestination();
      handleActionReturnToGoal(target.url, target.label);
    });

    document.getElementById("fg-lock-breath-btn")?.addEventListener("click", () => {
      overlay.remove();
      showInPageBreathReset();
    });

    document.getElementById("fg-pin-unlock-btn")?.addEventListener("click", () => {
      verifyPinUnlock();
    });

    document.getElementById("fg-lock-close-btn")?.addEventListener("click", () => {
      const target = getTargetGoalDestination();
      handleActionReturnToGoal(target.url, target.label);
    });

    if (domLockoutInterval) clearInterval(domLockoutInterval);
    domLockoutInterval = setInterval(() => {
      lockoutRemainingSeconds--;
      const timerEl = document.getElementById("fg-inpage-lock-timer");
      if (timerEl) {
        const m = Math.floor(lockoutRemainingSeconds / 60).toString().padStart(2, "0");
        const s = (lockoutRemainingSeconds % 60).toString().padStart(2, "0");
        timerEl.textContent = `${m}:${s}`;
      }
      stopVideos();
      if (lockoutRemainingSeconds <= 0) {
        clearInterval(domLockoutInterval);
        dismissAllDomHud();
      }
    }, 1000);
  }

  // =========================================================================
  // ACTION HANDLERS
  // =========================================================================

  function handleActionReturnToGoal(overrideUrl, overrideLabel) {
    dismissAllDomHud();
    streakSeconds = 0;
    stopVideos();

    const target = getTargetGoalDestination();
    const destUrl = overrideUrl || target.url;
    const destLabel = overrideLabel || target.label;

    showToast(`🚀 Teleporting to ${destLabel}...`);

    fetchFromAnyServer("/api/v2/intervention/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervention_id: "int_inpage", action_id: "RETURN_TO_GOAL" })
    }).then(async (res) => {
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.result?.status === "ESCALATED_LOCK" || data.result?.is_focus_locked) {
          showInPageRestrictionShield();
          return;
        }
      }
    }).catch(() => {});

    // Teleport immediately!
    // 1. Tell background service worker to open the target tab and close this distracting tab
    try {
      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: "TELEPORT_TO_GOAL",
          url: destUrl,
          closeTab: true
        }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            window.location.href = destUrl;
          }
        });
      } else {
        window.location.href = destUrl;
      }
    } catch (e) {
      window.location.href = destUrl;
    }

    // Secondary fallback: if tab didn't close and still on distraction, navigate directly
    setTimeout(() => {
      if (window.location.href !== destUrl && isDistractionSite(window.location.href, document.title)) {
        window.location.href = destUrl;
      }
    }, 400);
  }

  function handleActionShortBreak() {
    dismissAllDomHud();
    goalPausedUntil = Date.now() + (5 * 60 * 1000); // 5 minutes break
    streakSeconds = 0;

    fetchFromAnyServer("/api/v2/intervention/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervention_id: "int_inpage", action_id: "SHORT_BREAK" })
    }).catch(() => {});

    showToast("⏸️ 5-minute focus break started. Interventions paused.");
  }

  function handleActionDismiss() {
    dismissAllDomHud();
    goalPausedUntil = Date.now() + (60 * 1000); // 60s snooze
    streakSeconds = 0;

    fetchFromAnyServer("/api/v2/intervention/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervention_id: "int_inpage", action_id: "DISMISS" })
    }).catch(() => {});

    showToast("⏳ Snoozed for 60 seconds.");
  }

  async function verifyPinUnlock() {
    const pinInput = document.getElementById("fg-pin-input");
    const pin = pinInput ? pinInput.value.trim() : "";
    let valid = (pin === "1234");

    try {
      const res = await fetchFromAnyServer("/api/face/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin })
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data.valid) valid = true;
      }
    } catch {}

    if (valid) {
      dismissAllDomHud();
      goalPausedUntil = Date.now() + (5 * 60 * 1000);
      showToast("🔓 Unlocked with PIN! Distraction restriction cleared.");
    } else {
      showToast("❌ Incorrect PIN. Default is 1234.");
    }
  }

  function dismissAllDomHud() {
    document.getElementById("focusguard-inpage-banner")?.remove();
    document.getElementById("focusguard-inpage-modal-overlay")?.remove();
    document.getElementById("focusguard-inpage-breath-overlay")?.remove();
    document.getElementById("focusguard-dom-blocked-overlay")?.remove();
    document.getElementById("focusguard-tab-freeze-overlay")?.remove();
    if (freezeInterval) clearInterval(freezeInterval);
    if (domLockoutInterval) clearInterval(domLockoutInterval);
    unlockScroll();
    isOverlayActive = false;
  }

  function showToast(message) {
    let toast = document.getElementById("fg-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "fg-toast";
      toast.className = "fg-inpage-element";
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #38bdf8;
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = "1";
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // =========================================================================
  // TELEMETRY SYNC & EVALUATION LOOP
  // =========================================================================

  async function evaluatePage() {
    const currentHref = window.location.href;
    const currentTitle = document.title;
    const isDistraction = isDistractionSite(currentHref, currentTitle);

    // If tab is currently immune or productive
    if (!isDistraction || isGoalPaused()) {
      isPageProductive = true;
      streakSeconds = 0;
      dismissAllDomHud();
      return;
    }

    try {
      const res = await fetchFromAnyServer("/api/v2/telemetry/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "chrome.exe",
          title: currentTitle,
          url: currentHref
        })
      });

      if (res && res.ok) {
        const data = await res.json();
        currentSession.status = data.session_status || "ACTIVE";
        currentSession.intent = data.intent;
        currentSession.risk = data.risk || { score: 0, level: 0 };
        currentSession.drift = data.drift || { drift_state: "NOMINAL", distraction_streak_seconds: 0 };

        // CRUCIAL BIOMETRIC PRESENCE GATING:
        // If enrolled owner is NOT in front of screen (Guest or Away), restrictions MUST NOT work!
        const isGuest = data.who_is_watching?.is_guest === true || data.who_is_watching?.status === "GUEST_WATCHING";
        const isAway = data.who_is_watching?.status === "AWAY" || data.who_is_watching?.user_present === false;
        if (data.restrictions_paused === true || isGuest || isAway) {
          isPageProductive = true;
          streakSeconds = 0;
          dismissAllDomHud();
          return;
        }

        // Check if page is marked productive by server intent engine
        if (data.relevant === true || data.classification === "PRODUCTIVE" || data.classification === "ALIGNED") {
          isPageProductive = true;
          streakSeconds = 0;
          dismissAllDomHud();
          return;
        }

        isPageProductive = false;

        // 1-Minute Tab Freeze Punishment Check
        if (data.is_freeze_punished || data.freeze_punishment?.active) {
          const rem = data.freeze_punishment?.remaining_seconds || 60;
          const rsn = data.freeze_punishment?.reason || "Excessive distraction detected (Instagram / YouTube Shorts / Unnecessary texting). 1-Minute Tab Freeze Penalty enforced.";
          showInPageFreezePunishment(rsn, rem);
          return;
        }

        // Level 4 Check: Lock engagement
        if (data.is_focus_locked || data.risk?.level === 4) {
          showInPageRestrictionShield();
          return;
        }

        // Active prompt received from 2.0 AI Recommendation Engine
        if (data.active_prompt) {
          const p = data.active_prompt;
          const target = getTargetGoalDestination();
          const targetUrl = p.target_url || data.intent?.target_url || target.url;
          const targetLabel = p.target_label || data.intent?.target_label || target.label;

          if (p.tier_level === 1) {
            showInPageAwarenessBanner(data.intent?.goal_text, window.location.hostname, data.drift?.distraction_streak_seconds || streakSeconds, targetUrl, targetLabel);
          } else {
            showInPageInterventionModal({
              headline: p.headline,
              message: p.message,
              rationale: p.rationale,
              tier_level: p.tier_level,
              risk_score: p.risk_score,
              goal_text: data.intent?.goal_text,
              target_url: targetUrl,
              target_label: targetLabel
            });
          }
          return;
        }
      }
    } catch {}

    // Standalone / Offline fallback logic:
    // If backend is unreachable, still provide progressive 2.0 adaptive experience:
    isPageProductive = false;
    streakSeconds += 1.5;

    const target = getTargetGoalDestination();
    const appName = window.location.hostname.replace("www.", "");
    const isReels = window.location.pathname.includes("/reels") || window.location.href.includes("/shorts");
    const isChat = ["whatsapp", "telegram", "discord", "messenger"].some(c => window.location.hostname.includes(c));

    // Instant 1-Minute Freeze on Excess Distraction (Instagram, Shorts, Texting)
    if (appName.includes("instagram") || isReels || isChat) {
      if (streakSeconds >= 18) {
        let rsn = "Excessive digital distraction detected (Instagram / YouTube Shorts / Unnecessary texting). As an active penalty, this tab is completely frozen for 1 minute.";
        if (isReels) rsn = "Excessive distraction detected: YouTube Shorts / Instagram Reels watched during focus session. 1-Minute Tab Freeze Penalty enforced.";
        if (isChat) rsn = "Excessive distraction detected: Unnecessary messaging / texting during focus session. 1-Minute Tab Freeze Penalty enforced.";
        showInPageFreezePunishment(rsn, 60);
        return;
      }
    }

    // 10s: Level 1 Awareness Banner over the distracted screen
    if (streakSeconds >= 10 && streakSeconds < 25) {
      showInPageAwarenessBanner(currentSession.intent?.goal_text || "Focus Session", appName, Math.round(streakSeconds), target.url, target.label);
    }

    // 25s: Level 2/3 AI Contextual Intervention Modal over the distracted screen
    if (streakSeconds >= 25 && streakSeconds < 75) {
      let headline = "Mind Mirror: Remember Why You Started";
      let msg = `You've spent over ${Math.round(streakSeconds)}s on ${appName}. You chose this session for a reason. Let's switch right now.`;
      if (isReels) {
        headline = "Mind Mirror: That Reel Won't Help You";
        msg = `Deep down, you know one reel turns into 45 minutes of regret. Let's teleport straight to ${target.label} right now.`;
      } else if (isChat) {
        headline = "Mind Mirror: Can This Chat Wait?";
        msg = `Replying right now breaks your flow state. These messages will still be here when you finish. Let's switch back to ${target.label}.`;
      }

      showInPageInterventionModal({
        headline: headline,
        message: msg,
        rationale: "Mind mirror prompt: Distraction diverges from declared focus goal.",
        tier_level: 2,
        risk_score: 65,
        goal_text: currentSession.intent?.goal_text || "Focus Session",
        target_url: target.url,
        target_label: target.label
      });
    }

    // 75s+: Level 4 Focus Lock Restriction Shield
    if (streakSeconds >= 75) {
      showInPageRestrictionShield();
    }
  }

  // Active Tab Periodic Loop (every 1.5 seconds)
  setInterval(() => {
    if (document.hidden || isGoalPaused()) {
      return;
    }
    evaluatePage();
  }, 1500);

  // Tab visibility switch & SPA navigation triggers
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      evaluatePage();
    }
  });

  window.addEventListener("yt-navigate-finish", () => {
    evaluatePage();
  });

  window.addEventListener("popstate", () => {
    evaluatePage();
  });

  // Global Emergency Hotkey: Alt + Shift + C clears all in-page restrictions
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && (e.code === "KeyC" || e.code === "KeyX")) {
      e.preventDefault();
      dismissAllDomHud();
      goalPausedUntil = Date.now() + 60000;
      showToast("🧹 Focus Guard in-page restrictions cleared!");
    }
  });

  console.log("[Focus Guard 2.0] In-page adaptive intervention shield active.");
})();
