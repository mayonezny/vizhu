import httpx
import os
import base64
import logging

logger = logging.getLogger(__name__)

MIME_TO_FORMAT = {
    "audio/webm":  "oggopus",
    "audio/ogg":   "oggopus",
    "audio/wav":   "lpcm",
    "audio/x-wav": "lpcm",
    "audio/mpeg":  "mp3",
    "audio/mp3":   "mp3",
}


class YandexSttService:
    API_URL = "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize"

    def __init__(self):
        self.folder_id = os.environ["YANDEX_FOLDER_ID"]
        self.api_key = os.environ["YANDEX_API_KEY"]

    async def recognize(self, audio_base64: str, mime_type: str, lang: str = "ru-RU") -> str:
        audio_bytes = base64.b64decode(audio_base64)
        audio_format = MIME_TO_FORMAT.get(mime_type, "oggopus")

        params = {
            "lang": lang,
            "format": audio_format
        }

        if audio_format == "lpcm":
            params["sampleRateHertz"] = 48000

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.API_URL,
                headers={
                    "Authorization": f"Api-key {self.api_key}",
                    "x-data-logging-enabled": "false",
                    "x-folder-id": self.folder_id,
                },
                content=audio_bytes,
                params=params,
                timeout=15.0,
            )
            response.raise_for_status()

        return response.json().get("result", "")