from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from services.gigachat import GigaChatService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
gigachat = GigaChatService()


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest):
    try:
        text, model = await gigachat.chat(body.text)
        return ChatResponse(text=text, model=model)
    except Exception as e:
        logger.error(f"chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
