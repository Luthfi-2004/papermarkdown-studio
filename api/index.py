import os
import sys

# Ensure repository root is in sys.path so 'app' package can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.server import app

class VercelPathFixMiddleware:
    """
    WSGI middleware to normalize PATH_INFO on Vercel:
    1. If Vercel rewrites requests to /api/index, restores the original requested
       path from HTTP_X_FORWARDED_URI, HTTP_X_MATCHED_PATH, or REQUEST_URI.
    2. If the request was for /api/index directly, routes it to root '/'.
    """
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        original_uri = (
            environ.get("HTTP_X_FORWARDED_URI") or
            environ.get("HTTP_X_MATCHED_PATH") or
            environ.get("RAW_URI") or
            environ.get("REQUEST_URI")
        )

        current_path = environ.get("PATH_INFO", "")

        if original_uri and original_uri not in ("/api/index", "/api/index.py"):
            if "?" in original_uri:
                path, query = original_uri.split("?", 1)
                environ["PATH_INFO"] = path
                environ["QUERY_STRING"] = query
            else:
                environ["PATH_INFO"] = original_uri
        elif current_path in ("/api/index", "/api/index.py"):
            environ["PATH_INFO"] = "/"

        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelPathFixMiddleware(app.wsgi_app)
