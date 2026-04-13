import firebase_admin
from firebase_admin import auth
from fastapi import Request, HTTPException
import os

# Development secret pre testovacie endpointy
DEV_SECRET = os.getenv("DEV_SECRET", "")

async def verify_dev_secret(request: Request):
    """
    Overí DEV_SECRET v hlavičke X-Dev-Secret.
    Používa sa pre testovacie endpointy bez Firebase auth.
    🔒 SECURITY: Endpoint je dostupný len s platným DEV_SECRET.
    """
    if not DEV_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Test endpoints disabled (DEV_SECRET not configured)"
        )

    secret_header = request.headers.get("X-Dev-Secret")
    if not secret_header or secret_header != DEV_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing X-Dev-Secret header"
        )

    return {"dev_mode": True, "uid": "test-user-dev"}

async def verify_firebase_token(request: Request):
    """
    Middleware na overenie Firebase ID tokenu v hlavičke Authorization.
    Očakáva formát: Authorization: Bearer <token>
    🔒 SECURITY: Auth je VŽDY povinný - žiadne SKIP_AUTH flags!
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        print(f"[AUTH] No header or invalid format for: {request.url.path}")
        raise HTTPException(
            status_code=401, 
            detail="auth/missing-or-invalid-header"
        )

    id_token = auth_header.split("Bearer ")[1]
    
    # Pre debugging (len prvých pár znakov)
    token_preview = f"{id_token[:10]}..." if id_token else "EMPTY"
    
    try:
        # 1. Poistka pre Render: Over či je Firebase inicializovaný
        try:
            firebase_admin.get_app()
        except ValueError:
            print("[AUTH] Firebase app not found, attempting emergency initialization...")
            from firebase_databaza import FirebaseService
            FirebaseService() # Toto spustí Singleton inicializáciu

        # 2. Over ID token pomocou Firebase Admin SDK
        decoded_token = auth.verify_id_token(id_token)
        request.state.user = decoded_token
        return decoded_token
        
    except auth.ExpiredIdTokenError:
        print(f"[AUTH ERROR] Token expired ({token_preview})")
        raise HTTPException(status_code=401, detail="auth/id-token-expired")
    except auth.InvalidIdTokenError:
        # Diagnostika pre neplatný token (len pre log)
        try:
            from jose import jwt
            unverified_claims = jwt.get_unverified_claims(id_token)
            token_project = unverified_claims.get("aud")
            current_app = firebase_admin.get_app()
            print(f"[AUTH ERROR] Token invalid. Token project: {token_project} vs App project: {current_app.project_id}")
        except:
            pass
        print(f"[AUTH ERROR] Token invalid ({token_preview}) - check Firebase Project ID")
        raise HTTPException(status_code=401, detail="auth/invalid-id-token")
    except Exception as e:
        print(f"[AUTH ERROR] Verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail=f"auth/error: {str(e)[:100]}")

async def check_admin_auth(request: Request):
    """
    Overuje, či má používateľ admin práva.
    Musí sa volať po verify_firebase_token.
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    from firebase_databaza import FirebaseService
    firebase = FirebaseService()
    if not firebase.is_admin(user["uid"]):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return user
