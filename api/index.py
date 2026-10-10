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

from ui.server import wsgi_app, FocusGuardRequestHandler

app = wsgi_app
application = wsgi_app

try:
    from fastapi import FastAPI
    from starlette.middleware.wsgi import WSGIMiddleware
    fastapi_app = FastAPI(title="Focus Guard 2.0 API")
    fastapi_app.mount("/", WSGIMiddleware(wsgi_app))
    app = fastapi_app
except Exception:
    pass

class handler(FocusGuardRequestHandler):
    pass
