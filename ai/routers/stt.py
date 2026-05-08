from fastapi import APIRouter, HTTPException
from models.schemas import SttRequest, SttResponse
from services.yandex_stt import YandexSttService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
yandex_stt = YandexSttService()


@router.post("", response_model=SttResponse)
async def transcribe(body: SttRequest):
    try:
        text = await yandex_stt.recognize(body.audio, body.mime_type, body.lang)
        return SttResponse(text=text)
    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))