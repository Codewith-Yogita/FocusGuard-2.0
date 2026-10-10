#!/usr/bin/env python3
"""
Focus Guard 2.0 - UI Directory Index Entrypoint
"""
from ui.server import app, application, handler, wsgi_app, FocusGuardRequestHandler, run_server, DEFAULT_PORT

if __name__ == "__main__":
    run_server(DEFAULT_PORT)
