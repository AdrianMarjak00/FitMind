from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class EntryType(str, Enum):
    food = "food"
    exercise = "exercise"
    mood = "mood"
    stress = "stress"
    sleep = "sleep"
    weight = "weight"

class ChartType(str, Enum):
    calories = "calories"
    exercise = "exercise"
    mood = "mood"
    stress = "stress"
    sleep = "sleep"
    weight = "weight"

# --- AI CHAT MODELY ---
class ChatRequest(BaseModel):
    """Model pre prichádzajúcu správu od užívateľa"""
    message: str = Field(..., max_length=2000)
    conversation_id: Optional[str] = None

class CreateConversationRequest(BaseModel):
    """Model pre vytvorenie novej četovej konverzácie"""
    title: Optional[str] = "Nová konverzácia"

# --- PROFIL A POUŽÍVATEĽ ---
class UpdateProfileRequest(BaseModel):
    """Model pre aktualizáciu údajov v profile používateľa"""
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    currentWeight: Optional[float] = None
    targetWeight: Optional[float] = None
    fitnessGoal: Optional[str] = None
    activityLevel: Optional[str] = None
    profileImageUrl: Optional[str] = None

# --- PLATBY (STRIPE) ---
class CreateCheckoutRequest(BaseModel):
    """Model pre vytvorenie platobnej relácie"""
    plan_type: str  # napr. "basic" alebo "pro"
    success_url: str
    cancel_url: str

# --- ADMIN PANEL ---
class CancelSubscriptionRequest(BaseModel):
    """Model pre admina na zrušenie predplatného podľa emailu"""
    email: str

# --- EMAILOVÉ NOTIFIKÁCIE ---
class SendWelcomeEmailRequest(BaseModel):
    """Model pre odoslanie uvítacieho emailu"""
    email: str
    first_name: str