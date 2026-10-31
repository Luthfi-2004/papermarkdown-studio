import os
import sys
from urllib.parse import parse_qs

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.server import app

class VercelRouteMiddleware:
    """
    WSGI middleware that maps Vercel's rewritten requests with __route query
    parameter to the proper PATH_INFO so Flask routes match cleanly.
    """
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        query_string = environ.get("QUERY_STRING", "")
        if "__route=" in query_string:
            params = parse_qs(query_string)
            route = params.get("__route", [""])[0]
            if route:
                environ["PATH_INFO"] = f"/api/{route.lstrip('/')}"
        elif environ.get("HTTP_X_FORWARDED_URI", "").startswith("/api/"):
            raw_uri = environ["HTTP_X_FORWARDED_URI"]
            environ["PATH_INFO"] = raw_uri.split("?")[0]
            
        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelRouteMiddleware(app.wsgi_app)
