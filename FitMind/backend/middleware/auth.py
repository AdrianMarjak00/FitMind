from fastapi import Request, HTTPException
from firebase_admin import auth
import os

async def verify_firebase_token(request: Request):
    """
    Middleware na overenie Firebase ID tokenu v hlavičke Authorization.
    Očakáva formát: Authorization: Bearer <token>
    """
    # Preskoč overenie v development móde ak je nastavené (voliteľné)
    if os.getenv("SKIP_AUTH") == "true":
        return None

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Missing or invalid authorization header"
        )

    id_token = auth_header.split("Bearer ")[1]
    try:
        # Over ID token pomocou Firebase Admin SDK
        decoded_token = auth.verify_id_token(id_token)
        # Pridaj dekódovaný token (obsahuje uid) do state požiadavky
        request.state.user = decoded_token
        return decoded_token
    except Exception as e:
        print(f"[AUTH ERROR] {e}")
        raise HTTPException(
            status_code=401, 
            detail="Invalid or expired token"
        )

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
    from firebase_service import FirebaseService
    firebase = FirebaseService()
    if not firebase.is_admin(user["uid"]):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return user
