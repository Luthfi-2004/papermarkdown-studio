import os
import sys

# Ensure repository root is in sys.path so 'app' package can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.server import app

# Vercel serverless Python WSGI handler
