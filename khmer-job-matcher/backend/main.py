# """Compatibility entry point: uvicorn main:app still works from backend/."""
# from app.main import app  # noqa: F401
"""Vercel and Uvicorn entry point."""

from app.main import app

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://khmerjob-frontend.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
