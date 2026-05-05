from fastapi import APIRouter, HTTPException
from models.schemas import ImageRequest, CurrencyResponse
from services.gigachat import GigaChatService
import logging
import re

router = APIRouter()
logger = logging.getLogger(__name__)
gigachat = GigaChatService()


@router.post("", response_model=CurrencyResponse)
async def recognize_currency(body: ImageRequest):
    """
    ФТ-3: Распознавание российских купюр.
    """
    try:
        prompt = (
            "На фото российская купюра. "
            "Ответь ТОЛЬКО номиналом и словом рублей, например: 1000 рублей. "
            "Если купюры нет — ответь: не определено."
        )
        text = await gigachat.vision(body.image, body.mime_type, prompt)
        return CurrencyResponse(amount=text.strip(), confidence=0.95)
    except Exception as e:
        logger.error(f"currency error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
