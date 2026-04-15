from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class EntryType(str, Enum):
    """Povolené typy záznamov pre /api/entries endpointy."""
    food     = "food"
    exercise = "exercise"
    mood     = "mood"
    stress   = "stress"
    sleep    = "sleep"
    weight   = "weight"


class ChartType(str, Enum):
    """Povolené typy grafov pre /api/chart endpointy."""
    calories = "calories"
    exercise = "exercise"
    mood     = "mood"
    stress   = "stress"
    sleep    = "sleep"
    weight   = "weight"


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000, description="Správa pre AI trénera")
    conversation_id: Optional[str] = Field(None, description="ID konverzácie")


class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field("Nová konverzácia", description="Názov konverzácie")


class UpdateProfileRequest(BaseModel):
    """Všetky polia sú voliteľné – pošli len to, čo chceš zmeniť."""
    firstName:       Optional[str]   = None
    lastName:        Optional[str]   = None
    age:             Optional[int]   = None
    gender:          Optional[str]   = None
    height:          Optional[float] = None
    currentWeight:   Optional[float] = None
    targetWeight:    Optional[float] = None
    fitnessGoal:     Optional[str]   = None
    activityLevel:   Optional[str]   = None
    profileImageUrl: Optional[str]   = None


class CreateCheckoutRequest(BaseModel):
    plan_type:   str = Field(..., description="Typ plánu: 'basic'")
    success_url: str = Field(..., description="URL po úspešnej platbe")
    cancel_url:  str = Field(..., description="URL pri zrušení platby")


class CancelSubscriptionRequest(BaseModel):
    email: str = Field(..., description="Email používateľa ktorému sa ruší subscription")


class SendWelcomeEmailRequest(BaseModel):
    email:      str = Field(..., description="Email príjemcu")
    first_name: str = Field(..., description="Krstné meno pre personalizáciu")
