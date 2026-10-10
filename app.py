#!/usr/bin/env python3
"""
Focus Guard 2.0 - Vercel & WSGI/ASGI Entrypoint
Exposes WSGI/ASGI callable 'app', 'application', and BaseHTTPRequestHandler 'handler'.
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

# Top-level AST assignments required by Vercel Function static scanner
app = wsgi_app
application = wsgi_app
handler = FocusGuardRequestHandler

try:
    from fastapi import FastAPI
    from starlette.middleware.wsgi import WSGIMiddleware
    fastapi_app = FastAPI(title="Focus Guard 2.0")
    fastapi_app.mount("/", WSGIMiddleware(wsgi_app))
    app = fastapi_app
except Exception:
    pass

if __name__ == "__main__":
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
