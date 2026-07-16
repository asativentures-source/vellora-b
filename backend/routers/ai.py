"""AI health-assessment endpoint (Aria — Claude Sonnet 4.5 via emergentintegrations)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from deps import uid, logger, EMERGENT_LLM_KEY

router = APIRouter(prefix="/ai")

class AssessmentMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

@router.post("/assessment")
async def ai_assessment(payload: AssessmentMessage):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(500, f"AI unavailable: {e}")

    session_id = payload.session_id or uid("chat")
    system_message = (
        "You are Aria, a warm, empathetic, science-backed AI health assistant for a "
        "GLP-1 obesity and metabolic health platform. Ask 1 question at a time to "
        "gather: weight, height, health goals, medical history (diabetes, PCOS, "
        "thyroid, cardiovascular), current medications, dietary habits, and "
        "activity level. After 5-6 questions, provide a friendly summary and next "
        "steps: recommend booking a doctor consultation. Never diagnose. Never "
        "prescribe. Keep replies under 90 words. Use plain language."
    )
    chat = (
        LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message)
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )
    try:
        reply = await chat.send_message(UserMessage(text=payload.message))
    except Exception as e:
        logger.exception("AI chat failed")
        raise HTTPException(500, f"AI error: {e}")
    return {"session_id": session_id, "reply": reply}
