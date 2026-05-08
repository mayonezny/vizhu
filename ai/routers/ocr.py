from fastapi import APIRouter, HTTPException
from models.schemas import ImageRequest, OcrResponse
from services.yandex_vision import YandexVisionService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
yandex = YandexVisionService()


@router.post("", response_model=OcrResponse)
async def extract_text(body: ImageRequest):
    """
    ФТ-2: OCR печатного и рукописного текста.
    Использует Yandex Vision OCR.
    """
    try:
        text, model = await yandex.ocr(body.image)
        return OcrResponse(text=text, model=model)
    except Exception as e:
        logger.error(f"ocr error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
