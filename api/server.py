#!/usr/bin/env python3
"""
Vercel Serverless Function - api/server.py
"""

from api.index import app, application, handler

def get_app():
    return app
