import sys
import os

# Pridaj priečinok backend do cesty, aby Python vedel importovať moduly
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Importuj Fastapi app z backend/main.py
from backend.main import app

# Toto umožní Google Cloud Run nájsť aplikáciu hneď v roote
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
