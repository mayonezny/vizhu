import asyncio
import base64
import json
import logging
import os
import subprocess
import tempfile

import httpx

logger = logging.getLogger(__name__)

MIME_TO_FORMAT = {
    "audio/ogg":        "OGG_OPUS",
    "audio/webm":       "MP4",      
    "audio/wav":        "LINEAR16_PCM",
    "audio/x-wav":      "LINEAR16_PCM",
    "audio/mp3":        "MP3",
    "audio/mpeg":       "MP3",
}


class YandexSttService:
    RECOGNIZE_URL = "https://stt.api.cloud.yandex.net/stt/v3/recognizeFileAsync"
    OPERATION_URL = "https://operation.api.cloud.yandex.net/operations/{operation_id}"
    RESULT_URL    = "https://stt.api.cloud.yandex.net/stt/v3/getRecognition"

    def __init__(self):
        self.folder_id = os.environ["YANDEX_FOLDER_ID"]
        self.api_key   = os.environ["YANDEX_API_KEY"]

    @property
    def _headers(self):
        return {
            "Authorization": f"Api-key {self.api_key}",
            "x-folder-id": self.folder_id,
        }

    @staticmethod
    def _webm_to_ogg(audio_bytes: bytes) -> bytes:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as src:
            src.write(audio_bytes)
            src_path = src.name
        dst_path = src_path.replace(".webm", ".ogg")
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", src_path, "-c:a", "libopus", dst_path],
                check=True, capture_output=True,
            )
            with open(dst_path, "rb") as f:
                return f.read()
        finally:
            os.unlink(src_path)
            if os.path.exists(dst_path):
                os.unlink(dst_path)

    async def recognize(self, audio_base64: str, mime_type: str, lang: str = "ru-RU") -> str:
        base_mime = mime_type.split(";")[0].strip()

        if base_mime in ("audio/webm", "video/webm"):
            logger.info("Конвертируем WebM → OGG")
            audio_bytes = base64.b64decode(audio_base64)
            audio_bytes = self._webm_to_ogg(audio_bytes)
            audio_base64 = base64.b64encode(audio_bytes).decode()
            base_mime = "audio/ogg"

        audio_format = MIME_TO_FORMAT.get(base_mime, "OGG_OPUS")

        payload = {
            "content": audio_base64,
            "recognitionModel": {
                "model": "general",
                "audioFormat": {
                    "containerAudio": {
                        "containerAudioType": audio_format
                    }
                },
                "languageRestriction": {
                    "restrictionType": "WHITELIST",
                    "languageCode": [lang]
                },
                "textNormalization": {
                    "textNormalization": "TEXT_NORMALIZATION_ENABLED",
                    "profanityFilter": False,
                    "literatureText": True
                }
            }
        }

        async with httpx.AsyncClient() as client:
            # 1. Отправляем файл — получаем operation_id
            response = await client.post(
                self.RECOGNIZE_URL,
                headers=self._headers,
                json=payload,
                timeout=15.0,
            )
            logger.info(f"Yandex STT status={response.status_code} body={response.text[:500]}")
            response.raise_for_status()
            operation_id = response.json().get("id")
            if not operation_id:
                raise ValueError("Яндекс не вернул operation_id")

            logger.info(f"STT operation_id: {operation_id}")

            # 2. Polling — ждём пока операция завершится
            for attempt in range(20):  # максимум 20 попыток по 2 сек = 40 сек
                await asyncio.sleep(2)

                op_response = await client.get(
                    self.OPERATION_URL.format(operation_id=operation_id),
                    headers=self._headers,
                    timeout=10.0,
                )
                op_response.raise_for_status()
                op_data = op_response.json()

                if op_data.get("done"):
                    if "error" in op_data:
                        raise ValueError(f"STT операция завершилась с ошибкой: {op_data['error']}")
                    break
            else:
                raise TimeoutError("STT операция не завершилась за 40 секунд")

            # 3. Забираем результат
            result_response = await client.get(
                self.RESULT_URL,
                headers=self._headers,
                params={"operation_id": operation_id},
                timeout=10.0,
            )
            result_response.raise_for_status()

        # Парсим построчный JSON
        text_parts = []
        for line in result_response.text.strip().split("\n"):
            if not line:
                continue
            try:
                chunk = json.loads(line)
                alternatives = (
                    chunk.get("result", {})
                    .get("finalRefinement", {})
                    .get("normalizedText", {})
                    .get("alternatives", [])
                )
                for alt in alternatives:
                    text = alt.get("text", "")
                    if text:
                        text_parts.append(text)
            except json.JSONDecodeError:
                continue

        return " ".join(text_parts)