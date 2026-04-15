import firebase_admin
from firebase_admin import auth
from fastapi import Request, HTTPException
import os

DEV_SECRET = os.getenv("DEV_SECRET", "")


async def verify_dev_secret(request: Request):
    """Overí DEV_SECRET v hlavičke X-Dev-Secret. Len pre testovacie endpointy."""
    if not DEV_SECRET:
        raise HTTPException(status_code=503, detail="Test endpoints disabled (DEV_SECRET not configured)")

    secret_header = request.headers.get("X-Dev-Secret")
    if not secret_header or secret_header != DEV_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Dev-Secret header")

    return {"dev_mode": True, "uid": "test-user-dev"}


async def verify_firebase_token(request: Request):
    """
    Overí Firebase ID token z hlavičky Authorization: Bearer <token>.
    Vráti decoded_token pri úspechu, alebo HTTP 401 pri neplatnom tokene.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        print(f"[AUTH] No header or invalid format for: {request.url.path}")
        raise HTTPException(status_code=401, detail="auth/missing-or-invalid-header")

    id_token = auth_header.split("Bearer ")[1]
    token_preview = f"{id_token[:10]}..." if id_token else "EMPTY"

    try:
        try:
            firebase_admin.get_app()
        except ValueError:
            print("[AUTH] Firebase app not found, attempting emergency initialization...")
            from firebase_databaza import FirebaseService
            FirebaseService()

        decoded_token = auth.verify_id_token(id_token)
        request.state.user = decoded_token
        return decoded_token

    except auth.ExpiredIdTokenError:
        print(f"[AUTH ERROR] Token expired ({token_preview})")
        raise HTTPException(status_code=401, detail="auth/id-token-expired")
    except auth.InvalidIdTokenError:
        try:
            from jose import jwt
            unverified_claims = jwt.get_unverified_claims(id_token)
            token_project = unverified_claims.get("aud")
            current_app = firebase_admin.get_app()
            print(f"[AUTH ERROR] Token invalid. Token project: {token_project} vs App project: {current_app.project_id}")
        except Exception:
            pass
        print(f"[AUTH ERROR] Token invalid ({token_preview}) - check Firebase Project ID")
        raise HTTPException(status_code=401, detail="auth/invalid-id-token")
    except Exception as e:
        print(f"[AUTH ERROR] Verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail=f"auth/error: {str(e)[:100]}")


async def check_admin_auth(request: Request):
    """Overuje admin práva. Musí sa volať po verify_firebase_token."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    from firebase_databaza import FirebaseService
    firebase = FirebaseService()
    if not firebase.is_admin(user["uid"]):
        raise HTTPException(status_code=403, detail="Admin privileges required")

    return user
