from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

from app.core.config import get_settings
from app.routers.jobs import router
from app.routers.auth import router as auth_router
from app.routers.students import router as students_router
from app.routers.admin import router as admin_router
from app.routers.saved import router as saved_router
from app.routers.applications import router as applications_router
from app.routers.matching import router as matching_router
from app.routers.resumes import router as resumes_router
from app.routers.employers import router as employer_router
from app.routers.companies import router as companies_router
from app.routers.recovery import router as recovery_router
from app.routers.notifications import router as notifications_router
from app.routers.social_auth import router as social_auth_router


def create_app() -> FastAPI:
    application = FastAPI(title='Khmer Job Matcher API', version='0.3.0')
    application.add_middleware(CORSMiddleware,
        allow_origins=[get_settings().frontend_origin], allow_credentials=False,
        allow_methods=['GET', 'POST', 'PATCH', 'DELETE'], allow_headers=['Authorization', 'Content-Type'])

    @application.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code,
            content={'error': {'code': 'http_error', 'message': str(exc.detail)}}, headers=exc.headers)

    @application.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        details = [{'location': list(e['loc']), 'message': e['msg'], 'type': e['type']} for e in exc.errors()]
        return JSONResponse(status_code=422, content={'error': {
            'code': 'validation_error', 'message': 'Invalid request', 'details': details}})

    @application.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, exc: SQLAlchemyError):
        return JSONResponse(status_code=503, content={'error': {
            'code': 'database_unavailable', 'message': 'Database unavailable. Check configuration and migrations.'}})

    @application.get('/')
    def home():
        return {'message': 'Welcome to Khmer Job Matcher API'}

    @application.get('/api/health', tags=['health'])
    def health():
        # Liveness only; this does not claim database readiness.
        return {'status': 'ok', 'database_checked': False}

    application.include_router(router)
    application.include_router(auth_router)
    application.include_router(students_router)
    application.include_router(admin_router)
    application.include_router(saved_router)
    application.include_router(applications_router)
    for extra_router in [matching_router, resumes_router, employer_router, companies_router, recovery_router, notifications_router, social_auth_router]:
        application.include_router(extra_router)
    return application


app = create_app()
