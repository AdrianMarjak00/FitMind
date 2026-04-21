from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import os

app = FastAPI(title="Test Angular-Python")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class Polozka(BaseModel):
    nazov: str
    cena: float

polozky: list[dict] = []


@app.get("/polozky")
def get_polozky():
    return polozky


@app.post("/polozky")
def pridaj_polozku(polozka: Polozka):
    polozky.append(polozka.model_dump())
    return {"status": "ok", "ulozena": polozka, "celkovo": len(polozky)}


@app.get("/", response_class=HTMLResponse)
def testovacia_stranka():
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    with open(html_path, encoding="utf-8") as f:
        return f.read()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
