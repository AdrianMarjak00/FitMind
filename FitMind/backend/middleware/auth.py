from fastapi import Request, HTTPException
from firebase_admin import auth
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
    
    # DEBUG LOGGING START
    if not auth_header:
        print(f"[AUTH DEBUG] No Authorization header received for {request.url.path}")
    else:
        token_preview = auth_header[:15] + "..." if len(auth_header) > 15 else auth_header
        print(f"[AUTH DEBUG] Auth header received: {token_preview} for {request.url.path}")
    # DEBUG LOGGING END

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Missing or invalid authorization header"
        )

    id_token = auth_header.split("Bearer ")[1]
    try:
        # Over ID token pomocou Firebase Admin SDK
        decoded_token = auth.verify_id_token(id_token)
        request.state.user = decoded_token
        return decoded_token
    except auth.ExpiredIdTokenError:
        print(f"[AUTH ERROR] Token expired for request to {request.url.path}")
        raise HTTPException(status_code=401, detail="Token expired")
    except auth.InvalidIdTokenError as e:
        print(f"[AUTH ERROR] Token invalid for request to {request.url.path}")
        print(f"[AUTH DEBUG] Error details: {str(e)}")
        # Check if the error message contains project ID mismatch info
        if "project id" in str(e).lower():
            print(f"[AUTH HINT] Project ID mismatch! Backend expects token for its configured project.")
        raise HTTPException(status_code=401, detail="Token invalid")
    except auth.RevokedIdTokenError:
        print(f"[AUTH ERROR] Token revoked for request to {request.url.path}")
        raise HTTPException(status_code=401, detail="Token revoked")
    except ValueError as e:
        print(f"[AUTH ERROR] Invalid token format: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token format")
    except Exception as e:
        print(f"[AUTH ERROR] Unexpected: {str(e)} for request to {request.url.path}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def check_admin_auth(request: Request):
    """
    Overuje, či má používateľ admin práva.
    Musí sa volať po verify_firebase_token.
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Tu môžeš pridať vlastnú logiku kontroly admina (napr. cez custom claims alebo Firestore)
    # V tomto projekte kontrolujeme admina v firebase_service
    from firebase_databaza import FirebaseService
    firebase = FirebaseService()
    if not firebase.is_admin(user["uid"]):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return user
