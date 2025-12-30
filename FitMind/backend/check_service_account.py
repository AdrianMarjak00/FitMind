import os
import json
import sys

def check_service_account():
    print("=" * 60)
    print("Firebase Service Account - Kontrola")
    print("=" * 60)
    print()
    
    file_path = "firebase-service-account.json"
    
    if not os.path.exists(file_path):
        print(f"[CHYBA] {file_path} neexistuje!")
        print()
        print("[RIEĹ ENIE] Stiahni service account:")
        print("  1. Firebase Console > Project Settings > Service accounts")
        print("  2. Generate new private key")
        return False
    
    print(f"[OK] SĂşbor {file_path} existuje")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print("[OK] SĂşbor je platnĂ˝ JSON")
        
        required_fields = ['project_id', 'private_key', 'client_email']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            print(f"[CHYBA] ChĂ˝bajĂş polia: {', '.join(missing_fields)}")
            return False
        
        print("[OK] VĹˇetky povinnĂ© polia sĂş prĂ­tomnĂ©")
        print()
        print("InformĂˇcie o service account:")
        print(f"  Projekt: {data.get('project_id', 'N/A')}")
        print(f"  Email: {data.get('client_email', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"[CHYBA] Chyba: {e}")
        return False

if __name__ == "__main__":
    success = check_service_account()
    print()
    if success:
        print("[OK] Service account je platnĂ˝!")
    else:
        print("[CHYBA] Service account mĂˇ problĂ©my!")
        print()
        print("[RIEĹ ENIE] Stiahni novĂ˝ service account z Firebase Console")
        sys.exit(1)
