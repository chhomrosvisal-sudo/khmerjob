from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, selectinload

from app.core.dependencies import Database, StudentUser
from app.models import Application, Job, JobSkill, Resume
from app.schemas.applications import ApplicationOut, ApplicationPage
from app.schemas.auth import StrictInput

router = APIRouter(prefix='/api/applications', tags=['applications'])


class ApplicationCreate(StrictInput):
    attach_resume: bool = True


def query_applications():
    return select(Application).options(
        joinedload(Application.job).joinedload(Job.employer),
        joinedload(Application.job).selectinload(Job.requirements).joinedload(JobSkill.skill),
    )


@router.get('', response_model=ApplicationPage)
def own_applications(user: StudentUser, db: Database, response: Response,
                     page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100),
                     job_id: int | None = Query(None, gt=0)):
    response.headers['Cache-Control'] = 'no-store'
    conditions = [Application.user_id == user.id]
    if job_id is not None:
        conditions.append(Application.job_id == job_id)
    total = db.scalar(select(func.count()).select_from(Application).where(*conditions))
    items = db.scalars(query_applications().where(*conditions)
                       .order_by(Application.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return ApplicationPage(items=items, total=total, page=page, page_size=page_size)


@router.post('/{job_id}', response_model=ApplicationOut, status_code=201)
def apply(job_id: int, user: StudentUser, db: Database, response: Response, payload: ApplicationCreate | None = None):
    response.headers['Cache-Control'] = 'no-store'
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(404, 'Job not found')
    if not job.is_active or not job.employer.approved:
        raise HTTPException(409, 'This job is closed to new applications')
    existing = select(Application).where(Application.user_id == user.id, Application.job_id == job_id)
    application = db.scalar(existing)
    if application is None:
        attach = payload is None or payload.attach_resume
        latest_resume = db.scalar(select(Resume).where(Resume.user_id == user.id).order_by(Resume.id.desc()).limit(1)) if attach else None
        application = Application(user_id=user.id, job_id=job_id, status='submitted',
                                  resume_id=latest_resume.id if latest_resume else None)
        db.add(application)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            application = db.scalar(existing)
            if application is None:
                raise
            response.status_code = 200
    else:
        response.status_code = 200
    return db.scalar(query_applications().where(Application.user_id == user.id, Application.job_id == job_id))
