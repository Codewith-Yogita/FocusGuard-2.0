#!/usr/bin/env python3
"""
Focus Guard 2.0 - WSGI Entrypoint
"""
from server import app, application, handler, wsgi_app, FocusGuardRequestHandler

if __name__ == "__main__":
    from server import run_server, DEFAULT_PORT
    run_server(DEFAULT_PORT)
