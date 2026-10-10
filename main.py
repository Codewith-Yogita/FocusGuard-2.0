#!/usr/bin/env python3
"""
Focus Guard 2.0 - Main Entrypoint
"""

import os
import sys

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if os.path.join(ROOT_DIR, "tools") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT_DIR, "tools"))

from ui.server import wsgi_app, FocusGuardRequestHandler, run_server, DEFAULT_PORT

def app(environ, start_response):
    return wsgi_app(environ, start_response)

application = app
handler = FocusGuardRequestHandler

if __name__ == "__main__":
    run_server(DEFAULT_PORT)
