import httpx
import os
import logging

logger = logging.getLogger(__name__)


class YandexVisionService:
    """
    Yandex Vision OCR API.
    Документация: https://yandex.cloud/ru/docs/vision/ocr/api-ref/
    """

    API_URL = "https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText"

    def __init__(self):
        self.folder_id = os.environ["YANDEX_FOLDER_ID"]
        self.api_key = os.environ["YANDEX_API_KEY"]

    async def ocr(self, image_base64: str) -> tuple[str, str]:
        payload = {
            "mimeType": "JPEG",
            "languageCodes": ["ru", "en"],
            "model": "page",
            "content": image_base64,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.API_URL,
                headers={
                    "Authorization": f"Api-Key {self.api_key}",
                    "x-folder-id": self.folder_id,
                    "x-data-logging-enabled": "false",  # не логируем данные пользователей
                },
                json=payload,
                timeout=10.0,
            )
            response.raise_for_status()

        data = response.json()
        result = data.get("result", {})

        # Собираем весь распознанный текст
        blocks = result.get("textAnnotation", {}).get("blocks", [])
        lines = []
        for block in blocks:
            for line in block.get("lines", []):
                line_text = " ".join(
                    word.get("text", "") for word in line.get("words", [])
                )
                lines.append(line_text)

        model_version = result.get("modelVersion", "")
        model = f"yandex-vision-page-{model_version}" if model_version else "yandex-vision-page"

        return "\n".join(lines), model
