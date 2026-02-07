"""
Security Middleware for FitMind Backend
Provides rate limiting, security headers, and request validation
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.status import HTTP_429_TOO_MANY_REQUESTS
from collections import defaultdict
from datetime import datetime, timedelta
import time
import os

# Zisti či sme v produkcii
IS_PRODUCTION = os.getenv("ENV", "production").lower() == "production"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent API abuse
    Default: 100 requests per minute per IP
    """
    
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        
    async def dispatch(self, request: Request, call_next):
        # Get client IP - robust handle for proxies
        client_ip = "unknown"
        if request.client:
            client_ip = request.client.host
        
        # Check X-Forwarded-For if behind a proxy like Render/Cloudflare
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Skip rate limiting for health check endpoints
        if request.url.path in ["/", "/health", "/api/health"]:
            return await call_next(request)
        
        # Clean old requests (older than 1 minute)
        now = time.time()
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < 60
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return JSONResponse(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {self.requests_per_minute} requests per minute allowed"
                }
            )
        
        # Add current request
        self.requests[client_ip].append(now)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            self.requests_per_minute - len(self.requests[client_ip])
        )
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all responses
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Preskočiť CSP pre FastAPI docs (Swagger UI) v development móde
        docs_paths = ["/docs", "/redoc", "/openapi.json"]
        is_docs_path = any(request.url.path.startswith(p) for p in docs_paths)

        if is_docs_path and not IS_PRODUCTION:
            # Pre docs endpointy v dev móde - minimálne headers
            response.headers["X-Content-Type-Options"] = "nosniff"
            return response

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # COOP - unsafe-none pre Firebase Auth popup (Google/Apple Sign-In)
        # Najmenej reštriktívna politika pre kompatibilitu s popup autentifikáciou
        response.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"

        # HSTS - iba v produkcii (zabezpečuje že prehliadač použije HTTPS)
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content Security Policy - Relaxed for production and local development
        csp_rules = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://ssl.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://ssl.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "connect-src 'self' http://localhost:* https://*.googleapis.com https://*.firebaseio.com https://fitmind-backend-fvq7.onrender.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com",
            "frame-src 'self' https://fitmind-dba6a.firebaseapp.com",
            "object-src 'none'"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_rules)

        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Limits request body size to prevent DoS attacks
    Default: 10 MB
    """
    
    def __init__(self, app, max_size: int = 10 * 1024 * 1024):  # 10 MB
        super().__init__(app)
        self.max_size = max_size
        
    async def dispatch(self, request: Request, call_next):
        # Check Content-Length header
        if request.headers.get("content-length"):
            content_length = int(request.headers["content-length"])
            if content_length > self.max_size:
                return JSONResponse(
                    status_code=413,
                    content={
                        "error": "Request too large",
                        "message": f"Maximum request size is {self.max_size / (1024*1024):.1f} MB"
                    }
                )
        
        return await call_next(request)


def validate_user_id(user_id: str) -> None:
    """
    Validates user ID format
    Raises HTTPException if invalid
    """
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if len(user_id) > 128:
        raise HTTPException(status_code=400, detail="User ID too long")
    
    # Basic alphanumeric check (adjust based on your Firebase user ID format)
    if not all(c.isalnum() or c in "-_" for c in user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")


def get_authorized_user_id(user_id: str, decoded_token: dict) -> str:
    """
    Overí a vráti autorizované user_id z tokenu.
    Ak sa user_id nezhoduje s tokenom, vráti token uid (bezpečnostná ochrana).
    
    Args:
        user_id: User ID z URL parametra
        decoded_token: Dekódovaný Firebase token
        
    Returns:
        Bezpečné user_id (vždy z tokenu ak nesedí)
    """
    token_uid = decoded_token.get("uid")
    if token_uid != user_id:
        print(f"[SECURITY] User {token_uid} tried to access data of {user_id}")
        return token_uid  # Force users to see only their data
    return user_id


def sanitize_error_message(error: Exception, production: bool = True) -> str:
    """
    Sanitizes error messages to prevent information disclosure
    
    Args:
        error: The exception that occurred
        production: If True, returns generic message. If False, returns detailed message
    
    Returns:
        Sanitized error message
    """
    if production:
        # Generic error messages for production
        error_type = type(error).__name__
        if "Firebase" in error_type or "Firestore" in error_type:
            return "Database error occurred"
        elif "Google" in str(error) or "Gemini" in str(error) or "API" in str(error):
            return "AI service temporarily unavailable"
        else:
            return "An error occurred processing your request"
    else:
        # Detailed errors for development
        return str(error)
