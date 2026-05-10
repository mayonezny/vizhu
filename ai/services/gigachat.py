from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole
import os
import logging
import base64
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class GigaChatService:
    def __init__(self):
        self.credentials = os.environ["GIGACHAT_CREDENTIALS"]

    def _client(self) -> GigaChat:
        return GigaChat(credentials=self.credentials, verify_ssl_certs=False)

    async def chat(self, text: str) -> tuple[str, str]:
        with self._client() as giga:
            response = giga.chat(Chat(
                messages=[Messages(role=MessagesRole.USER, content=text)],
                model="GigaChat-2-Pro",
            ))
            return response.choices[0].message.content, response.model

    async def vision(self, image_base64: str, mime_type: str, prompt: str) -> tuple[str, str]:
        image_bytes = base64.b64decode(image_base64)

        with self._client() as giga:
            # Сначала загружаем файл — SDK возвращает id
            uploaded = giga.upload_file(
                ("image.jpg", BytesIO(image_bytes), mime_type)
            )

            response = giga.chat(Chat(
                messages=[
                    Messages(
                        role=MessagesRole.USER,
                        content=prompt,
                        attachments=[uploaded.id_]  # передаём id загруженного файла
                    )
                ],
                model="GigaChat-2-Max"
            ))
            return response.choices[0].message.content, response.model