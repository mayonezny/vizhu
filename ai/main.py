from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from contextlib import asynccontextmanager
from routers import describe, currency, ocr, stt, chat
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI-сервис запущен")
    yield
    logger.info("AI-сервис остановлен")


app = FastAPI(
    title="ВИЖУ AI Service",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

app.include_router(describe.router, prefix="/describe", tags=["describe"])
app.include_router(currency.router, prefix="/currency", tags=["currency"])
app.include_router(ocr.router,      prefix="/ocr",      tags=["ocr"])
app.include_router(stt.router,      prefix="/stt",      tags=["stt"])
app.include_router(chat.router,     prefix="/chat",     tags=["chat"])


@app.get("/health")
def health():
    return {"status": "ok"}
