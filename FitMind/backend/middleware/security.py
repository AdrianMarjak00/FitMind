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
        # Get client IP
        client_ip = request.client.host
        
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
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # HSTS (only if using HTTPS in production)
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://identitytoolkit.googleapis.com https://firestore.googleapis.com"
        )
        
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
        elif "OpenAI" in str(error) or "API" in str(error):
            return "AI service temporarily unavailable"
        else:
            return "An error occurred processing your request"
    else:
        # Detailed errors for development
        return str(error)
