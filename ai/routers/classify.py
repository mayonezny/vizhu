import re
from fastapi import APIRouter, HTTPException
from models.schemas import ClassifyRequest, ClassifyResponse
from services.gigachat import GigaChatService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
gigachat = GigaChatService()

PREPROMPT = """\
Ты классификатор голосовых команд для приложения помощи слабовидящим людям.

Определи, к какому варианту относится команда пользователя:
0. Не распознана — команда не относится ни к одному варианту
1. Описание фото — пользователь хочет узнать что на фото
   («опиши», «что здесь», «что это», «расскажи что видишь», «посмотри», «что на картинке»)
2. Распознавание текста — пользователь хочет прочитать текст с фото
   («прочитай», «что написано», «есть ли текст», «читай», «разбери текст»)
3. Распознавание купюры — пользователь хочет узнать номинал банкноты
   («какая купюра», «сколько рублей», «деньги», «банкнота», «номинал», «сколько это»)
4. Звонок волонтёру — пользователь хочет связаться с волонтёром
   («волонтёр», «помогите», «позови помощника», «нужна помощь», «свяжи с волонтёром»)
5. Произвольный звонок — пользователь хочет позвонить конкретному человеку
   («позвони», «набери», «вызови», «соедини с»)

Примеры:
«опиши что здесь» → 1
«что на картинке» → 1
«прочитай что написано» → 2
«есть тут текст» → 2
«какая это купюра» → 3
«сколько рублей» → 3
«позови волонтёра» → 4
«помогите мне» → 4
«позвони маме» → 5
«набери Сашу» → 5
«как дела» → 0
«что за погода» → 0

Ответь одной цифрой от 0 до 5. Только цифра, без пояснений.

Команда: """


def _parse(raw: str) -> int:
    match = re.search(r"[0-5]", raw.strip())
    if not match:
        raise ValueError(f"Не удалось распарсить ответ GigaChat: {raw!r}")
    return int(match.group())


@router.post("", response_model=ClassifyResponse)
async def classify(body: ClassifyRequest):
    try:
        raw, _ = await gigachat.chat(PREPROMPT + body.text)
        logger.info(f"classify input={body.text!r} → GigaChat={raw!r}")
        command = _parse(raw)
        return ClassifyResponse(command=command, raw=raw)
    except Exception as e:
        logger.error(f"classify error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
