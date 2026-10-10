#!/usr/bin/env python3
"""
Vercel Serverless Function Entrypoint for Focus Guard 2.0
Routes API and serverless requests to FocusGuardRequestHandler & WSGI app.
"""

import os
import sys

# Add project root and tools to sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if os.path.join(ROOT_DIR, "tools") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT_DIR, "tools"))

from ui.server import app, application, handler, wsgi_app, FocusGuardRequestHandler
