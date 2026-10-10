#!/usr/bin/env python3
"""
Focus Guard 2.0 - Root Server & Deployment Entrypoint
Serves as entrypoint for local execution and cloud platforms (Vercel, Render, Railway).
Exposes WSGI callable 'app' and 'application' as required by Vercel Function Python runtime.
"""

import os
import sys

# Ensure root and tools directories are in sys.path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if os.path.join(ROOT_DIR, "tools") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT_DIR, "tools"))

from ui.server import wsgi_app, FocusGuardRequestHandler, run_server, DEFAULT_PORT

# Explicit top-level function definition and assignment for Vercel AST static scanner
def app(environ, start_response):
    return wsgi_app(environ, start_response)

application = app
handler = FocusGuardRequestHandler

if __name__ == "__main__":
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
