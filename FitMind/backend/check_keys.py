import os
import sys
from dotenv import load_dotenv

# Načítaj .env
load_dotenv()

print("=== DIAGNOSTIKA KĽÚČOV ===")

# 1. Google API Key
google_key = os.getenv("GOOGLE_API_KEY")
if google_key:
    if "your-" in google_key or "example" in google_key:
        print("❌ GOOGLE_API_KEY je placeholder! Nastavte skutočný kľúč.")
    else:
        print(f"✅ GOOGLE_API_KEY nájdený: {google_key[:5]}...{google_key[-3:]}")
else:
    print("❌ GOOGLE_API_KEY chýba v prostredí (.env)")

# 2. Firebase Credentials
firebase_env = os.getenv("FIREBASE_SERVICE_ACCOUNT")
if firebase_env:
    print("✅ FIREBASE_SERVICE_ACCOUNT nájdený v prostredí")
else:
    print("⚠️ FIREBASE_SERVICE_ACCOUNT chýba v prostredí")

# 3. Firebase File
if os.path.exists("serviceAccountKey.json"):
    print("✅ serviceAccountKey.json existuje lokálne")
else:
    print("⚠️ serviceAccountKey.json neexistuje lokálne")

if not firebase_env and not os.path.exists("serviceAccountKey.json"):
    print("❌ CHÝBA FIREBASE KONFIGURÁCIA! (Ani ENV ani súbor)")

input("\nStlačte Enter pre ukončenie...")
