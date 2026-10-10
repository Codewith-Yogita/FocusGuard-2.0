#!/usr/bin/env python3
"""
Focus Guard 2.0 - Alternate Entrypoint for Cloud Deployment
Exposes WSGI callable 'app' and 'application' for Vercel.
"""

from server import app, application, handler, wsgi_app, FocusGuardRequestHandler, run_server, DEFAULT_PORT

if __name__ == "__main__":
    run_server(DEFAULT_PORT)
