import httpx
import os
import logging
from base64 import b64encode

logger = logging.getLogger(__name__)

# Токен кэшируем в памяти — GigaChat выдаёт на 30 минут
_token_cache: dict = {"token": None, "expires_at": 0}


class GigaChatService:
    """
    Работа с GigaChat Vision API (Сбер).
    Документация: https://developers.sber.ru/docs/ru/gigachat/api/reference/
    """

    AUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
    API_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"

    def __init__(self):
        self.client_id = os.environ["GIGACHAT_CLIENT_ID"]
        self.client_secret = os.environ["GIGACHAT_CLIENT_SECRET"]

    async def _get_token(self) -> str:
        import time
        if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
            return _token_cache["token"]

        credentials = b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        async with httpx.AsyncClient(verify=False) as client:  # Сбер использует собственный CA
            response = await client.post(
                self.AUTH_URL,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "RqUID": "viju-mvp",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"scope": "GIGACHAT_API_PERS"},
            )
            response.raise_for_status()
            data = response.json()

        _token_cache["token"] = data["access_token"]
        _token_cache["expires_at"] = time.time() + data["expires_in"] - 60
        return _token_cache["token"]

    async def vision(self, image_base64: str, mime_type: str, prompt: str) -> str:
        token = await self._get_token()

        payload = {
            "model": "GigaChat-2",  # GigaChat-2-Pro для Premium
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}"
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            "max_tokens": 500,
        }

        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(
                self.API_URL,
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
                timeout=15.0,
            )
            response.raise_for_status()

        return response.json()["choices"][0]["message"]["content"]
