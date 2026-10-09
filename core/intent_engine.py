"""
Focus Guard 2.0 - User Intent Engine
Captures, parses, and provides contextual evaluation benchmarks for user intentions.
"""

import time
import re
import uuid
from typing import Dict, Any, List, Tuple, Optional

PRESET_CATEGORIES = {
    "study": {
        "label": "Study / Academics",
        "default_duration": 25,
        "allowed_keywords": ["dsa", "lecture", "course", "textbook", "notes", "quiz", "exam", "striver", "tutorial", "khan academy", "coursera", "edx", "mit", "stanford", "math", "physics", "cs"],
        "productive_apps": ["notion.exe", "obsidian.exe", "acrobat.exe", "anki.exe", "code.exe", "word.exe"],
        "productive_domains": ["leetcode.com", "geeksforgeeks.org", "wikipedia.org", "coursera.org", "edx.org", "arxiv.org", "docs.google.com", "canvas", "blackboard"],
        "high_risk_distractions": ["shorts", "reels", "tiktok.com", "instagram.com", "snapchat.com", "reddit.com", "netflix.com", "twitch.tv", "twitter.com", "x.com", "web.whatsapp.com", "discord.com", "web.telegram.org", "messenger.com"]
    },
    "coding": {
        "label": "Software Engineering / Coding",
        "default_duration": 45,
        "allowed_keywords": ["github", "gitlab", "stackoverflow", "docs", "api", "terminal", "powershell", "debug", "compile", "react", "python", "c++", "rust", "javascript", "docker"],
        "productive_apps": ["code.exe", "devenv.exe", "windowsterminal.exe", "cmd.exe", "git-bash.exe", "postman.exe", "docker.exe", "clion64.exe", "pycharm64.exe"],
        "productive_domains": ["github.com", "gitlab.com", "stackoverflow.com", "developer.mozilla.org", "npmjs.com", "pypi.org", "cppreference.com", "localhost"],
        "high_risk_distractions": ["shorts", "reels", "tiktok.com", "instagram.com", "reddit.com/r/funny", "netflix.com", "twitch.tv", "web.whatsapp.com", "discord.com", "web.telegram.org", "messenger.com"]
    },
    "work": {
        "label": "Deep Work / Professional",
        "default_duration": 30,
        "allowed_keywords": ["report", "presentation", "meeting", "roadmap", "proposal", "analytics", "sheet", "slide", "doc", "jira", "confluence", "trello"],
        "productive_apps": ["excel.exe", "powerpnt.exe", "winword.exe", "slack.exe", "teams.exe", "notion.exe"],
        "productive_domains": ["docs.google.com", "sheets.google.com", "slides.google.com", "jira.atlassian.com", "confluence.atlassian.com", "trello.com", "asana.com"],
        "high_risk_distractions": ["shorts", "reels", "tiktok.com", "instagram.com", "reddit.com", "netflix.com", "steam.exe", "web.whatsapp.com", "discord.com", "web.telegram.org", "messenger.com"]
    },
    "writing": {
        "label": "Writing / Content Creation",
        "default_duration": 40,
        "allowed_keywords": ["essay", "draft", "article", "thesis", "blog", "manuscript", "paper", "documentation", "grammar", "thesaurus"],
        "productive_apps": ["winword.exe", "typora.exe", "obsidian.exe", "notion.exe", "code.exe"],
        "productive_domains": ["docs.google.com", "overleaf.com", "grammarly.com", "thesaurus.com", "medium.com"],
        "high_risk_distractions": ["shorts", "reels", "tiktok.com", "instagram.com", "twitter.com", "x.com", "reddit.com", "web.whatsapp.com", "discord.com", "web.telegram.org"]
    },
    "communication": {
        "label": "Communication & Sync",
        "default_duration": 15,
        "allowed_keywords": ["mail", "inbox", "client", "team", "sync", "chat", "message", "whatsapp", "discord", "telegram"],
        "productive_apps": ["outlook.exe", "slack.exe", "teams.exe", "zoom.exe", "whatsapp.exe", "discord.exe"],
        "productive_domains": ["mail.google.com", "outlook.live.com", "slack.com", "web.whatsapp.com", "discord.com"],
        "high_risk_distractions": ["shorts", "reels", "tiktok.com", "instagram.com/reels", "netflix.com"]
    },
    "entertainment": {
        "label": "Intentional Leisure / Break",
        "default_duration": 20,
        "allowed_keywords": ["music", "podcast", "video", "stream", "show"],
        "productive_apps": ["spotify.exe", "vlc.exe"],
        "productive_domains": ["youtube.com", "netflix.com", "twitch.tv", "spotify.com"],
        "high_risk_distractions": []
    },
    "quick_task": {
        "label": "Quick Focused Task",
        "default_duration": 10,
        "allowed_keywords": ["pay", "submit", "upload", "download", "review"],
        "productive_apps": [],
        "productive_domains": [],
        "high_risk_distractions": ["shorts", "reels", "tiktok.com", "instagram.com"]
    },
    "custom": {
        "label": "Custom Goal",
        "default_duration": 25,
        "allowed_keywords": [],
        "productive_apps": [],
        "productive_domains": [],
        "high_risk_distractions": ["shorts", "reels", "tiktok.com", "instagram.com", "web.whatsapp.com", "discord.com"]
    }
}


def extract_keywords_from_goal(goal_text: str) -> List[str]:
    """Extracts informative keywords from freeform goal text."""
    if not goal_text:
        return []
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', goal_text.lower())
    words = [w for w in cleaned.split() if len(w) > 2]
    stop_words = {"the", "and", "for", "with", "this", "that", "from", "prepare", "finish", "complete", "study", "work", "make"}
    return [w for w in words if w not in stop_words]


def get_smart_destination(category: str, goal_text: str, custom_url: str = "") -> Tuple[str, str]:
    """
    Determines the productive launch destination URL and human label
    for the user's declared focus goal.
    """
    if custom_url and custom_url.strip().startswith("http"):
        return custom_url.strip(), "Custom Goal Workspace"

    g_low = (goal_text or "").lower()

    if "leetcode" in g_low:
        return "https://leetcode.com/problemset/all/", "LeetCode Problemset"

    if any(k in g_low for k in ["dsa", "tree", "graph", "algorithm", "binary search", "recursion"]):
        if any(k in g_low for k in ["striver", "lecture", "video", "youtube"]):
            return "https://www.youtube.com/results?search_query=dsa+trees+lecture+striver", "Striver DSA Trees Lecture (YouTube)"
        return "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/", "Striver A2Z DSA Sheet"

    if "youtube" in g_low or "lecture" in g_low or "course" in g_low:
        clean_q = re.sub(r'[^a-zA-Z0-9\s]', '', goal_text).replace(' ', '+')
        return f"https://www.youtube.com/results?search_query={clean_q}", f"Study Lecture for '{goal_text}'"

    if category == "coding" or "code" in g_low:
        return "https://leetcode.com/problemset/all/", "LeetCode Algorithm Practice"

    if category == "study":
        return "https://www.youtube.com/results?search_query=dsa+lecture+striver", "DSA Study Lecture"

    if category == "writing":
        return "https://docs.google.com", "Google Docs / Writing Workspace"

    return "https://leetcode.com/problemset/all/", "Target Goal Workspace"


def create_user_intent(
    category: str = "study",
    goal_text: str = "",
    duration_minutes: int = 25,
    user_id: str = "default_user",
    target_url: str = ""
) -> Dict[str, Any]:
    """Creates a validated, structured User Intent object with productive destination URL."""
    cat_key = category.lower().strip()
    if cat_key not in PRESET_CATEGORIES:
        cat_key = "custom"

    preset = PRESET_CATEGORIES[cat_key]
    dur = int(duration_minutes) if duration_minutes and int(duration_minutes) > 0 else preset["default_duration"]
    dur = max(5, min(240, dur))  # 5m to 4h limits

    goal_str = goal_text.strip()
    if not goal_str:
        goal_str = f"Focus session on {preset['label']}"

    extracted_kw = extract_keywords_from_goal(goal_str)
    all_keywords = list(set(preset["allowed_keywords"] + extracted_kw))

    dest_url, dest_label = get_smart_destination(cat_key, goal_str, target_url)

    intent = {
        "id": str(uuid.uuid4())[:8],
        "user_id": user_id,
        "category": cat_key,
        "category_label": preset["label"],
        "goal_text": goal_str,
        "duration_minutes": dur,
        "target_url": dest_url,
        "target_label": dest_label,
        "target_keywords": all_keywords,
        "productive_apps": preset["productive_apps"],
        "productive_domains": preset["productive_domains"],
        "high_risk_distractions": preset["high_risk_distractions"],
        "created_at": time.time(),
        "created_at_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    return intent


def evaluate_activity_against_intent(
    intent: Dict[str, Any],
    app_name: str,
    window_title: str,
    url: Optional[str] = None
) -> Tuple[float, str, str]:
    """
    Evaluates how closely current digital activity aligns with declared intent.
    Returns:
        alignment_score: float from -1.0 (strict mismatch) to +1.0 (strongly aligned)
        classification: 'ALIGNED', 'NEUTRAL', 'DRIFT_RISK', 'ACUTE_MISMATCH'
        reason: Plain English explanation
    """
    if not intent:
        return 0.0, "NEUTRAL", "No active intent declared."

    app_low = (app_name or "").lower()
    title_low = (window_title or "").lower()
    url_low = (url or "").lower()

    # Rule 1: Short-form algorithmic feeds are almost ALWAYS acute mismatch
    # unless user explicitly declared 'entertainment'
    is_short_form = any(sf in url_low or sf in title_low for sf in ["/shorts", "/reel", "reels", "tiktok.com", "instagram.com/reels"])
    if is_short_form and intent.get("category") != "entertainment":
        return -1.0, "ACUTE_MISMATCH", "Short-form algorithmic video feed detected (high distraction risk)."

    # Rule 1b: Social chatting & instant messaging detection during focused work/study
    chat_domains = [
        "web.whatsapp.com", "whatsapp.com", "discord.com",
        "web.telegram.org", "messenger.com", "messages.google.com",
        "instagram.com/direct"
    ]
    chat_apps = ["whatsapp.exe", "discord.exe", "telegram.exe", "signal.exe"]
    is_chatting = any(cd in url_low or cd in title_low for cd in chat_domains) or any(ca in app_low for ca in chat_apps)
    if is_chatting and intent.get("category") != "communication":
        return -0.90, "ACUTE_MISMATCH", "Social messaging / chatting detected during focus session (breaks flow state)."

    # Rule 2: Explicit high-risk distractions for this intent
    for dist in intent.get("high_risk_distractions", []):
        if dist in url_low or dist in app_low or dist in title_low:
            return -0.85, "ACUTE_MISMATCH", f"High-risk distraction '{dist}' diverges from '{intent.get('goal_text')}'."

    # Rule 3: Direct keyword match in window title or URL (Context-aware validation)
    matched_keywords = []
    for kw in intent.get("target_keywords", []):
        if kw and (kw in title_low or kw in url_low):
            matched_keywords.append(kw)

    if matched_keywords:
        return 0.95, "ALIGNED", f"Content matches intent keywords: {', '.join(matched_keywords[:3])}."

    # Rule 4: Productive Apps / Domains declared for intent
    for p_app in intent.get("productive_apps", []):
        if p_app in app_low:
            return 0.85, "ALIGNED", f"Productive tool '{p_app}' actively in use."

    for p_dom in intent.get("productive_domains", []):
        if p_dom in url_low:
            return 0.85, "ALIGNED", f"Productive resource '{p_dom}' in use."

    # Rule 4b: Known Educational & Research Platforms
    edu_platforms = [
        "coursera.org", "udemy.com", "edx.org", "khanacademy.org", "nptel.ac.in",
        "canvas", "blackboard", "moodle", "classroom.google.com", "unacademy.com",
        "pw.live", "physicswallah", "geeksforgeeks.org", "javatpoint.com", "w3schools.com",
        "freecodecamp.org", "wikipedia.org", "mit.edu", "stanford.edu", "sciencedirect.com"
    ]
    if any(ep in url_low or ep in title_low for ep in edu_platforms):
        return 0.85, "ALIGNED", "Educational platform or learning portal aligned with focus intent."

    # Rule 5: YouTube context nuance:
    # YouTube Shorts is acute distraction; standard lectures/videos are aligned or neutral
    if "youtube.com" in url_low or "youtube" in title_low:
        if "shorts" in url_low or "shorts" in title_low:
            return -0.85, "ACUTE_MISMATCH", "Algorithmic YouTube Shorts feed diverges from declared focus goal."

        educational_markers = [
            "lecture", "class", "tutorial", "course", "interview", "review", "explanation",
            "learn", "how to", "crash course", "walkthrough", "dsa", "programming",
            "system design", "guide", "concept", "chapter", "module", "part", "episode",
            "full course", "cs", "math", "physics", "chemistry", "biology", "science",
            "engineering", "gate", "jee", "neet", "upsc", "semester", "prof", "professor",
            "university", "academy", "notes", "revision", "one shot", "oneshot", "live",
            "webinar", "seminar", "talk", "conference", "podcast", "keynote", "overview", "lesson"
        ]
        if any(em in title_low for em in educational_markers):
            return 0.80, "ALIGNED", "Educational lecture / video aligned with study/work intent."
        if any(amb in title_low for amb in ["lofi", "ambient", "study music", "focus music", "binaural", "white noise", "chill"]):
            return 0.40, "NEUTRAL", "Background ambient audio supporting focus session."
        
        # During study/coding/research/work sessions, long-form videos are treated neutrally rather than penalized
        if intent.get("category") in ["study", "work", "coding", "writing", "research"]:
            return 0.30, "NEUTRAL", "Long-form video during study session (unclassified lecture or research)."

    # Rule 6: General social media or gaming
    social_and_games = ["instagram.com", "reddit.com", "twitter.com", "x.com", "facebook.com", "netflix.com", "twitch.tv", "discord.com", "steam.exe"]
    for sg in social_and_games:
        if sg in url_low or sg in app_low:
            if intent.get("category") == "entertainment":
                return 0.60, "ALIGNED", "Entertainment session matches activity."
            return -0.75, "DRIFT_RISK", f"Social or entertainment activity '{sg}' during focus session."

    # Rule 7: System utilities, file explorer, settings
    system_tools = ["explorer.exe", "taskmgr.exe", "settings", "search", "cmd.exe", "powershell.exe"]
    if any(st in app_low for st in system_tools):
        return 0.10, "NEUTRAL", "System navigation or file management."

    # Default: Neutral browsing
    return 0.0, "NEUTRAL", "General digital activity."
