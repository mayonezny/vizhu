from pydantic import BaseModel
from typing import Literal


class ImageRequest(BaseModel):
    image: str        # base64
    mime_type: str    # image/jpeg, image/png, etc.


class DescribeRequest(ImageRequest):
    mode: Literal["short", "detailed"] = "short"


class DescribeResponse(BaseModel):
    text: str         # текст описания
    model: str        # какая модель ответила


class CurrencyResponse(BaseModel):
    amount: str       # "1000 рублей"
    confidence: float


class OcrResponse(BaseModel):
    text: str
    model: str
    
class SttRequest(BaseModel):
    audio: str
    mime_type: str
    lang: str = "ru-RU"


class SttResponse(BaseModel):
    text: str
    model: str = "yandex-speechkit"


class ChatRequest(BaseModel):
    text: str


class ChatResponse(BaseModel):
    text: str
    model: str


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    command: int   # 0 — не распознано, 1–5 — команда
    raw: str       # ответ GigaChat для отладки
{
    "command": 1,
    "raw": "яП Идарас!"
}
