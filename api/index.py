"""
api/index.py
------------
Serverless entry point for Vercel Python deployment.
Adds the backend directory to sys.path and exposes the FastAPI ASGI app.
"""

import sys
from pathlib import Path

# Resolve root and backend directories
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(1, str(ROOT_DIR))

# Expose the FastAPI app
from app.main import app
