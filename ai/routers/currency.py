from fastapi import APIRouter, HTTPException
from models.schemas import ImageRequest, CurrencyResponse
from services.gigachat import GigaChatService
import logging
import re

router = APIRouter()
logger = logging.getLogger(__name__)
gigachat = GigaChatService()

SYSTEM = (
    "Ты — голосовой помощник для незрячих и слабовидящих людей. "
    "Единственная задача — по фотографии назвать номинал российской банкноты, "
    "чтобы человек понимал, какая у него купюра. Это функция доступности. "
    "Не обсуждай ничего постороннего, просто определи номинал."
)

PROMPT = (
    "На изображении — банкнота рубля. Определи её номинал.\n\n"
    "ГЛАВНОЕ ПРАВИЛО: номинал всегда напечатан на купюре прописью словами — "
    "читай именно слова, это самый надёжный признак:\n"
    "  ПЯТЬ РУБЛЕЙ → 5\n"
    "  ДЕСЯТЬ РУБЛЕЙ → 10\n"
    "  ПЯТЬДЕСЯТ РУБЛЕЙ → 50\n"
    "  СТО РУБЛЕЙ → 100\n"
    "  ДВЕСТИ РУБЛЕЙ → 200\n"
    "  ПЯТЬСОТ РУБЛЕЙ → 500\n"
    "  ТЫСЯЧА РУБЛЕЙ или ОДНА ТЫСЯЧА РУБЛЕЙ → 1000\n"
    "  ДВЕ ТЫСЯЧИ РУБЛЕЙ → 2000\n"
    "  ПЯТЬ ТЫСЯЧ РУБЛЕЙ → 5000\n\n"
    "Сверь слова с крупной цифрой в углах. Если цифра и слова расходятся — верь СЛОВАМ. "
    "НЕ добавляй и НЕ убирай нули. Номинал — это крупное число; не путай его с годом "
    "выпуска и с серийным номером (две буквы и длинный ряд цифр).\n\n"
    "Дополнительная проверка по цвету купюры (вторично):\n"
    "  5 — зелёная\n"
    "  10 — оливково-зелёная\n"
    "  50 — синяя/голубая\n"
    "  100 — коричнево-бежевая (старая) или жёлто-золотистая (новая)\n"
    "  200 — светло-зелёная\n"
    "  500 — фиолетовая\n"
    "  1000 — сине-зелёная (старая) или бирюзовая (новая)\n"
    "  2000 — синяя\n"
    "  5000 — красно-оранжевая\n\n"
    "Ответь СТРОГО двумя строками, без пояснений:\n"
    "Номинал: <число> рублей\n"
    "Уверенность: <число от 0 до 1>\n"
    "Если это не рублёвая банкнота или номинал не читается уверенно:\n"
    "Номинал: не определено\n"
    "Уверенность: 0"
)


def _parse(text: str) -> tuple[str, float]:
    """Достаёт номинал и уверенность из ответа модели."""
    amount = text.strip()
    m = re.search(r"[Нн]оминал\s*[:\-]?\s*(.+)", text)
    if m:
        amount = m.group(1).strip().rstrip(".")

    confidence = 0.0
    c = re.search(r"[Уу]веренност[ьи][^\d]*(\d+(?:[.,]\d+)?)\s*(%?)", text)
    if c:
        val = float(c.group(1).replace(",", "."))
        if c.group(2) == "%" or val > 1:
            val /= 100
        confidence = max(0.0, min(1.0, val))

    return amount, confidence


@router.post("", response_model=CurrencyResponse)
async def recognize_currency(body: ImageRequest):
    """
    ФТ-3: Распознавание российских купюр.
    """
    try:
        text, _ = await gigachat.vision(
            body.image,
            body.mime_type,
            PROMPT,
            system=SYSTEM,
            temperature=0.1,
            top_p=0.1,
            profanity_check=False,
        )
        amount, confidence = _parse(text)
        return CurrencyResponse(amount=amount, confidence=confidence)
    except Exception as e:
        logger.error(f"currency error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
