#!/usr/bin/env python3
"""
Focus Guard 2.0 - ui/index.py entrypoint fallback
"""

import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if os.path.join(ROOT_DIR, "tools") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT_DIR, "tools"))

try:
    from server import wsgi_app, FocusGuardRequestHandler
except ImportError:
    from ui.server import wsgi_app, FocusGuardRequestHandler

def app(environ, start_response):
    return wsgi_app(environ, start_response)

application = app
handler = FocusGuardRequestHandler
