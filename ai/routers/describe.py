from fastapi import APIRouter, HTTPException
from models.schemas import DescribeRequest, DescribeResponse
from services.gigachat import GigaChatService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
gigachat = GigaChatService()


@router.post("", response_model=DescribeResponse)
async def describe_scene(body: DescribeRequest):
    """
    ФТ-1: Описание сцены по фото.
    Принимает base64-картинку, возвращает текстовое описание.
    """
    try:
        prompt = (
            "Опиши кратко что на фото в 1-2 предложениях."
            if body.mode == "short"
            else "Подробно опиши всё что видишь на фото."
        )
        text, model = await gigachat.vision(body.image, body.mime_type, prompt)
        return DescribeResponse(text=text, model=model)
    except Exception as e:
        logger.error(f"describe error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
