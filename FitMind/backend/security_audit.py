#!/usr/bin/env python3
"""
🔒 FitMind Security Audit Script
Tento script kontroluje bezpečnostné riziká v projekte.
"""

import os
import sys
import json
from pathlib import Path

# ANSI farby pre výstup
RED = '\033[91m'
YELLOW = '\033[93m'
GREEN = '\033[92m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{text:^70}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}⚠ {text}{RESET}")

def print_error(text):
    print(f"{RED}✗ {text}{RESET}")

def check_file_exists(filepath, should_exist=True):
    """Skontroluj či súbor existuje (alebo neexistuje)"""
    exists = os.path.exists(filepath)
    if should_exist and exists:
        return True
    elif not should_exist and not exists:
        return True
    return False

def check_gitignore():
    """Skontroluj .gitignore"""
    print_header("KONTROLA .gitignore")
    
    gitignore_path = Path(__file__).parent / ".gitignore"
    
    if not gitignore_path.exists():
        print_error(".gitignore súbor neexistuje!")
        return False
    
    with open(gitignore_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    critical_patterns = [
        (".env", "Environment variables"),
        ("serviceAccountKey.json", "Firebase Service Account"),
        ("firebase-adminsdk", "Firebase Admin SDK credentials"),
    ]
    
    all_good = True
    for pattern, desc in critical_patterns:
        if pattern in content:
            print_success(f"{desc} je v .gitignore")
        else:
            print_error(f"{desc} CHÝBA v .gitignore - KRITICKÉ!")
            all_good = False
    
    return all_good

def check_sensitive_files():
    """Skontroluj citlivé súbory"""
    print_header("KONTROLA CITLIVÝCH SÚBOROV")
    
    backend_dir = Path(__file__).parent
    
    # Súbory ktoré MUSIA existovať
    should_exist = [
        (".env.example", "Example environment file"),
        (".gitignore", "Git ignore file"),
    ]
    
    # Súbory ktoré NESMÚ byť commitnuté (ale môžu existovať lokálne)
    sensitive = [
        ("serviceAccountKey.json", "Firebase credentials"),
        (".env", "Environment variables"),
    ]
    
    all_good = True
    
    for filename, desc in should_exist:
        filepath = backend_dir / filename
        if filepath.exists():
            print_success(f"{desc} existuje: {filename}")
        else:
            print_warning(f"{desc} neexistuje: {filename}")
            all_good = False
    
    for filename, desc in sensitive:
        filepath = backend_dir / filename
        if filepath.exists():
            print_warning(f"{desc} existuje lokálne (OK ak je v .gitignore): {filename}")
        else:
            print_warning(f"{desc} neexistuje - potrebuješ ho vytvoriť: {filename}")
    
    return all_good

def check_env_file():
    """Skontroluj .env súbor"""
    print_header("KONTROLA .env SÚBORU")
    
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print_warning(".env súbor neexistuje - vytvor ho z .env.example")
        return False
    
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Kontrola či sú nastavené API kľúče
    checks = [
        ("GOOGLE_API_KEY", "Google Gemini API Key"),
        ("ENV", "Environment setting"),
    ]
    
    all_good = True
    for var, desc in checks:
        if var in content:
            # Skontroluj či nie je placeholder
            for line in content.split('\n'):
                if line.strip().startswith(var):
                    if "your-" in line.lower() or "example" in line.lower() or "here" in line:
                        print_error(f"{desc} ({var}) je stále placeholder - NASTAV SKUTOČNÚ HODNOTU!")
                        all_good = False
                    else:
                        print_success(f"{desc} ({var}) je nastavený")
                    break
        else:
            print_error(f"{desc} ({var}) CHÝBA v .env")
            all_good = False
    
    return all_good

def check_git_history():
    """Skontroluj Git históriu pre citlivé súbory"""
    print_header("KONTROLA GIT HISTÓRIE")
    
    try:
        import subprocess
        
        # Skontroluj či je serviceAccountKey.json v git histórii
        result = subprocess.run(
            ['git', 'log', '--all', '--full-history', '--', 'backend/serviceAccountKey.json'],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        
        if result.stdout.strip():
            print_error("serviceAccountKey.json JE V GIT HISTÓRII!")
            print_error("MUSÍŠ ho odstrániť z histórie a znovu vygenerovať kľúč!")
            print_error("Použi: git filter-branch alebo BFG Repo-Cleaner")
            return False
        else:
            print_success("serviceAccountKey.json NIE JE v git histórii")
            
        # Skontroluj .env
        result = subprocess.run(
            ['git', 'log', '--all', '--full-history', '--', 'backend/.env'],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        
        if result.stdout.strip():
            print_warning(".env JE V GIT HISTÓRII - skontroluj či neobsahoval citlivé dáta")
            return False
        else:
            print_success(".env NIE JE v git histórii")
            
        return True
        
    except FileNotFoundError:
        print_warning("Git nie je nainštalovaný - preskakujem kontrolu git histórie")
        return True
    except Exception as e:
        print_warning(f"Nepodarilo sa skontrolovať git históriu: {e}")
        return True

def check_requirements():
    """Skontroluj dependencies"""
    print_header("KONTROLA DEPENDENCIES")
    
    req_path = Path(__file__).parent / "requirements.txt"
    
    if not req_path.exists():
        print_error("requirements.txt neexistuje!")
        return False
    
    with open(req_path, 'r') as f:
        requirements = f.read()
    
    # Bezpečnostné dependencies
    security_deps = [
        ("slowapi", "Rate limiting"),
        ("python-dotenv", "Environment variables"),
        ("firebase-admin", "Firebase authentication"),
    ]
    
    all_good = True
    for dep, desc in security_deps:
        if dep in requirements:
            print_success(f"{desc} ({dep}) je nainštalovaný")
        else:
            print_warning(f"{desc} ({dep}) nebol nájdený v requirements.txt")
            all_good = False
    
    return all_good

def main():
    print_header("🔒 FITMIND SECURITY AUDIT 🔒")
    
    results = {
        ".gitignore": check_gitignore(),
        "Sensitive Files": check_sensitive_files(),
        "Environment Variables": check_env_file(),
        "Git History": check_git_history(),
        "Dependencies": check_requirements(),
    }
    
    print_header("VÝSLEDKY AUDITU")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    for check, result in results.items():
        if result:
            print_success(f"{check}: PASSED")
        else:
            print_error(f"{check}: FAILED")
    
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"Úspešnosť: {passed}/{total} ({passed*100//total}%)")
    print(f"{BLUE}{'='*70}{RESET}\n")
    
    if passed == total:
        print_success("🎉 Všetky bezpečnostné kontroly prešli!")
        return 0
    else:
        print_error("⚠️  Niektoré bezpečnostné kontroly zlyhali - skontroluj výstup vyššie!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
