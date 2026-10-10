#!/usr/bin/env python3
"""
Focus Guard 2.0 - WSGI Entrypoint in ui/
"""
import os
import sys

UI_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(UI_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if os.path.join(ROOT_DIR, "tools") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT_DIR, "tools"))

from server import app, application, handler, wsgi_app, FocusGuardRequestHandler

if __name__ == "__main__":
    from server import run_server, DEFAULT_PORT
    run_server(DEFAULT_PORT)
