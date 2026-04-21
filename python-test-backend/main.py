from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Test Angular-Python komunikácie")

# CORS - povolíme Angular (localhost:4200) aby mohol volať tento server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Pydantic model - Angular musí posielať JSON v tomto formáte
class Polozka(BaseModel):
    nazov: str
    cena: float

# Dočasné úložisko v pamäti (namiesto databázy)
polozky: list[dict] = []


@app.get("/polozky")
def get_polozky():
    """Angular si vypýta všetky uložené položky."""
    return polozky


@app.post("/polozky")
def pridaj_polozku(polozka: Polozka):
    """Angular pošle novú položku, Pydantic ju zvaliduje a uložíme ju."""
    nova = polozka.model_dump()
    polozky.append(nova)
    return {"status": "ok", "ulozena": nova, "celkovo": len(polozky)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
