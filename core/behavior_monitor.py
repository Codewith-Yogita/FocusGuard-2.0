"""
Focus Guard 2.0 - Behavior & Telemetry Monitor
Captures active desktop/browser usage signals and provides an interactive simulation layer.
Maintains clear separation between REAL hardware/OS data and DEMO/SIMULATED data.
"""

import time
import sys
import os
import threading
from typing import Dict, Any, List, Optional, Tuple

# Win32 APIs via ctypes for real OS foreground tracking
IS_WINDOWS = sys.platform == "win32"
if IS_WINDOWS:
    import ctypes
    from ctypes import wintypes
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    psapi = ctypes.windll.psapi


class BehaviorMonitor:
    """
    Ingests and tracks user digital behavior across live OS telemetry,
    browser extension heartbeats, and interactive demonstration scenarios.
    """

    def __init__(self, history_limit: int = 50):
        self.history_limit = history_limit
        self.lock = threading.Lock()
        self.history: List[Dict[str, Any]] = []
        self.current_activity: Dict[str, Any] = {
            "app_name": "code.exe",
            "logical_name": "VS Code",
            "window_title": "FocusGuard 2.0 - Active Session",
            "url": None,
            "domain": None,
            "started_at": time.time(),
            "duration_seconds": 0,
            "is_simulated": False,
            "source": "INITIAL_FALLBACK"
        }
        self.switching_timestamps: List[float] = []
        self.is_monitoring_active = False
        self._monitor_thread = None

    # =========================================================================
    # REAL WIN32 OS TELEMETRY
    # =========================================================================

    def _get_live_win32_window(self) -> Dict[str, Any]:
        """Queries the actual active foreground window on Windows using user32/psapi."""
        if not IS_WINDOWS:
            return {
                "app_name": "python.exe",
                "logical_name": "Python Environment",
                "window_title": "Development Workspace",
                "url": None,
                "is_simulated": False,
                "source": "NON_WINDOWS_FALLBACK"
            }

        try:
            hwnd = user32.GetForegroundWindow()
            if not hwnd:
                return self.current_activity

            # Extract Window Title
            length = user32.GetWindowTextLengthW(hwnd)
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value or "Desktop / Background"

            # Extract Process ID and Executable Name
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            app_name = "unknown.exe"

            h_proc = kernel32.OpenProcess(0x0400 | 0x0010, False, pid.value)
            if h_proc:
                img_name = ctypes.create_unicode_buffer(512)
                size = wintypes.DWORD(512)
                if kernel32.QueryFullProcessImageNameW(h_proc, 0, img_name, ctypes.byref(size)):
                    app_name = os.path.basename(img_name.value)
                kernel32.CloseHandle(h_proc)

            logical = app_name.replace(".exe", "").title()
            if "code" in app_name.lower():
                logical = "VS Code"
            elif "chrome" in app_name.lower():
                logical = "Google Chrome"
            elif "msedge" in app_name.lower():
                logical = "Microsoft Edge"
            elif "firefox" in app_name.lower():
                logical = "Mozilla Firefox"

            return {
                "app_name": app_name.lower(),
                "logical_name": logical,
                "window_title": title,
                "url": None,  # URLs are populated via browser extension heartbeats
                "domain": None,
                "is_simulated": False,
                "source": "REAL_WIN32"
            }
        except Exception as e:
            return {
                "app_name": "system.exe",
                "logical_name": "System Activity",
                "window_title": f"Telemetry Note ({e})",
                "url": None,
                "domain": None,
                "is_simulated": False,
                "source": "REAL_WIN32_RECOVERY"
            }

    # =========================================================================
    # TELEMETRY RECORDING & SWITCH TRACKING
    # =========================================================================

    def record_activity(
        self,
        app_name: str,
        window_title: str,
        url: Optional[str] = None,
        logical_name: Optional[str] = None,
        is_simulated: bool = False,
        source: str = "DIRECT"
    ) -> Dict[str, Any]:
        """Records an incoming activity update (from OS poll, browser extension, or demo scenario)."""
        now = time.time()
        app_low = (app_name or "unknown.exe").lower()
        title_str = window_title or ""
        url_str = url or ""
        domain = self._extract_domain(url_str) if url_str else None

        with self.lock:
            curr = self.current_activity
            # Check if this represents a context switch
            has_switched = (
                curr.get("app_name") != app_low or
                (url_str and curr.get("url") != url_str) or
                (not url_str and abs(len(title_str) - len(curr.get("window_title", ""))) > 15)
            )

            if has_switched:
                # Close previous activity duration
                prev_duration = max(1, int(now - curr.get("started_at", now)))
                curr["duration_seconds"] = prev_duration
                self.history.append(dict(curr))
                if len(self.history) > self.history_limit:
                    self.history.pop(0)

                # Record switch timestamp
                self.switching_timestamps.append(now)
                # Keep switches from last 5 minutes (300s)
                self.switching_timestamps = [t for t in self.switching_timestamps if (now - t) <= 300]

                # Initialize new current activity
                self.current_activity = {
                    "app_name": app_low,
                    "logical_name": logical_name or app_low.replace(".exe", "").title(),
                    "window_title": title_str,
                    "url": url_str if url_str else None,
                    "domain": domain,
                    "started_at": now,
                    "duration_seconds": 0,
                    "is_simulated": is_simulated,
                    "source": source
                }
            else:
                # Update current activity in-place
                curr["duration_seconds"] = int(now - curr.get("started_at", now))
                if url_str:
                    curr["url"] = url_str
                    curr["domain"] = domain
                if title_str:
                    curr["window_title"] = title_str
                curr["is_simulated"] = is_simulated
                curr["source"] = source

            return dict(self.current_activity)

    def _extract_domain(self, url: str) -> Optional[str]:
        """Safely extracts domain from full URL for privacy-safe tracking."""
        if not url:
            return None
        clean = url.replace("https://", "").replace("http://", "").split("/")[0]
        return clean.lower()

    def get_current_state(self) -> Dict[str, Any]:
        """Returns the current activity, duration, and recent switching velocity."""
        now = time.time()
        with self.lock:
            # Refresh live duration
            self.current_activity["duration_seconds"] = int(now - self.current_activity.get("started_at", now))
            # Clean switches older than 5m
            self.switching_timestamps = [t for t in self.switching_timestamps if (now - t) <= 300]
            switches_in_5m = len(self.switching_timestamps)

            return {
                "current_activity": dict(self.current_activity),
                "switches_last_5m": switches_in_5m,
                "history_length": len(self.history),
                "recent_history": list(self.history[-5:]),
                "is_simulated": self.current_activity.get("is_simulated", False),
                "source": self.current_activity.get("source", "UNKNOWN")
            }

    def poll_live_telemetry(self) -> Dict[str, Any]:
        """Polls the real Windows OS foreground state if active and not in demo lock."""
        win_info = self._get_live_win32_window()
        return self.record_activity(
            app_name=win_info.get("app_name", ""),
            window_title=win_info.get("window_title", ""),
            url=win_info.get("url"),
            logical_name=win_info.get("logical_name"),
            is_simulated=False,
            source="REAL_WIN32"
        )


# Global singleton monitor
behavior_monitor = BehaviorMonitor()
