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

    async def vision(self, image_base64: str, mime_type: str, prompt: str) -> tuple[str, str]:
        image_bytes = base64.b64decode(image_base64)

        with GigaChat(credentials=self.credentials, verify_ssl_certs=False) as giga:
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