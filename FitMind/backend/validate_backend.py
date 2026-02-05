import sys
import os
import traceback

# Add current directory to path
sys.path.append(os.getcwd())

print("Testing imports...")
try:
    print("1. Importing firebase_databaza...")
    import firebase_databaza
    print("   OK")
    
    print("2. Importing ai_trener...")
    import ai_trener
    print("   OK")
    
    print("3. Importing statistiky...")
    import statistiky
    print("   OK")
    
    print("4. Importing recenzie...")
    import recenzie
    print("   OK")
    
    print("5. Importing stripe_plat_brana...")
    import stripe_plat_brana
    print("   OK")
    
    print("6. Importing middleware...")
    import middleware
    print("   OK")
    
    print("7. Importing main...")
    import main
    print("   OK - Backend structure is valid!")
    
except Exception as e:
    print(f"\n[FAIL] Import error: {e}")
    traceback.print_exc()
