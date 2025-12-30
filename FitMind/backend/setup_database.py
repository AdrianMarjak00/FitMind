"""
Jednoduchý skript na vytvorenie základnej štruktúry databázy pre používateľa
"""
import firebase_admin
from firebase_admin import credentials, firestore
import sys
import os

def init_firebase():
    """Inicializuje Firebase"""
    try:
        if not firebase_admin._apps:
            cred_path = "firebase-service-account.json"
            if not os.path.exists(cred_path):
                print(f"[ERROR] {cred_path} neexistuje!")
                print("[INFO] Stiahni service account z Firebase Console")
                print("  1. https://console.firebase.google.com/")
                print("  2. Vyber projekt FitMind")
                print("  3. Project Settings > Service accounts")
                print("  4. Generate new private key")
                return None
            
            # Skontroluj súbor
            try:
                import json
                with open(cred_path, 'r') as f:
                    data = json.load(f)
                    if 'project_id' not in data or 'private_key' not in data:
                        print(f"[ERROR] {cred_path} je neplatny!")
                        print("[INFO] Stiahni NOVY service account z Firebase Console")
                        return None
            except json.JSONDecodeError:
                print(f"[ERROR] {cred_path} nie je platny JSON!")
                return None
            
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as e:
        error_msg = str(e)
        if "Invalid JWT Signature" in error_msg or "invalid_grant" in error_msg:
            print(f"[ERROR] Firebase service account je neplatny!")
            print("[RIESENIE] Stiahni NOVY service account:")
            print("  1. https://console.firebase.google.com/")
            print("  2. Vyber projekt FitMind")
            print("  3. Project Settings > Service accounts")
            print("  4. Generate new private key")
            print("  5. VYMAZ starý firebase-service-account.json")
            print("  6. Premenuj nový súbor na firebase-service-account.json")
        else:
            print(f"[ERROR] Chyba pri inicializacii Firebase: {e}")
        return None

def create_user_profile(db, user_id: str, email: str = None):
    """Vytvorí základný používateľský profil"""
    if not db:
        print("[ERROR] Firebase nie je pripojeny!")
        return False
    
    try:
        user_ref = db.collection('userFitnessProfiles').document(user_id)
        if user_ref.get().exists:
            print(f"[SKIP] Profil pre {user_id} uz existuje")
            return True
        
        data = {
            'userId': user_id,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        if email:
            data['email'] = email
        
        user_ref.set(data)
        print(f"[OK] Profil pre {user_id} vytvoreny")
        return True
    except Exception as e:
        error_msg = str(e)
        if "Invalid JWT Signature" in error_msg or "invalid_grant" in error_msg:
            print(f"[ERROR] Firebase service account je neplatny!")
            print("[RIESENIE] Stiahni NOVY service account z Firebase Console")
        else:
            print(f"[ERROR] Chyba pri vytvarani profilu: {e}")
        return False

def create_admin(db, user_id: str, email: str):
    """Vytvorí admin dokument"""
    try:
        admin_ref = db.collection('admins').document(user_id)
        if admin_ref.get().exists:
            print(f"[SKIP] Admin {email} uz existuje")
            return True
        
        data = {
            'userId': user_id,
            'email': email,
            'isAdmin': True,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        admin_ref.set(data)
        print(f"[OK] Admin {email} vytvoreny")
        return True
    except Exception as e:
        print(f"[ERROR] Chyba pri vytvarani admina: {e}")
        return False

def main():
    print("=" * 60)
    print("FitMind Database Setup")
    print("=" * 60)
    print()
    
    # Inicializuj Firebase
    print("[INFO] Inicializujem Firebase...")
    db = init_firebase()
    if not db:
        print()
        print("[ERROR] Nepodarilo sa pripojit k Firebase!")
        print("[INFO] Skontroluj firebase-service-account.json")
        sys.exit(1)
    print("[OK] Firebase inicializovany")
    print()
    
    # Získaj vstup
    user_id = input("Zadaj User ID (Firebase Auth UID): ").strip()
    if not user_id:
        print("[ERROR] User ID je povinny!")
        sys.exit(1)
    
    email = input("Zadaj email (volitelne): ").strip()
    is_admin = input("Vytvorit admin ucet? (y/n): ").strip().lower() == 'y'
    
    print()
    print("[INFO] Vytvaram pouzivatelsky profil...")
    create_user_profile(db, user_id, email)
    
    if is_admin and email:
        print()
        print("[INFO] Vytvaram admin ucet...")
        create_admin(db, user_id, email)
    
    print()
    print("=" * 60)
    print("[OK] Database setup dokonceny!")
    print("=" * 60)
    print()
    print("Vytvorene kolekcie:")
    print(f"  - userFitnessProfiles/{user_id}")
    if is_admin:
        print(f"  - admins/{user_id}")
    print()

if __name__ == "__main__":
    main()
