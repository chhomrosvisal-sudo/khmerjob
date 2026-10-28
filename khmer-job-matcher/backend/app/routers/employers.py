from typing import Literal
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import Field, field_validator
from sqlalchemy import select, func
from app.core.dependencies import Database, EmployerUser
from app.models import Employer, Application, User, StudentProfile, Resume, Job, Notification
from app.schemas.auth import StrictInput
from app.routers.resumes import file_response

router = APIRouter(prefix='/api/employer', tags=['employer management'])
TRANSITIONS = {'submitted': ['reviewing', 'rejected'], 'reviewing': ['shortlisted', 'rejected'],
               'shortlisted': ['accepted', 'rejected'], 'accepted': [], 'rejected': []}


def company(user, db):
    employer = db.scalar(select(Employer).where(Employer.user_id == user.id))
    if employer is None:
        raise HTTPException(403, 'Employer profile not configured')
    return employer


class CompanyPatch(StrictInput):
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default='', max_length=4000)
    location: str = Field(default='', max_length=100)
    website: str = Field(default='', max_length=250)

    @field_validator('website')
    @classmethod
    def website_url(cls, value):
        if value and not value.startswith(('https://', 'http://')):
            raise ValueError('Website must use https:// or http://')
        return value


@router.get('/company')
def own_company(user: EmployerUser, db: Database):
    item = company(user, db)
    return {name: getattr(item, name) for name in ['id', 'name', 'description', 'location', 'website', 'approved']}


@router.patch('/company')
def edit_company(payload: CompanyPatch, user: EmployerUser, db: Database):
    item = company(user, db)
    if not payload.name.strip():
        raise HTTPException(422, 'Company name cannot be blank')
    for key, value in payload.model_dump().items():
        setattr(item, key, value.strip())
    db.commit()
    return own_company(user, db)


@router.get('/applications')
def applicants(user: EmployerUser, db: Database, response: Response, page: int = Query(1, ge=1),
               page_size: int = Query(12, ge=1, le=100), q: str = Query('', max_length=160), status: str = ''):
    own = company(user, db)
    statement = select(Application, Job, User, StudentProfile).join(Job, Application.job_id == Job.id).join(
        User, Application.user_id == User.id).join(StudentProfile, StudentProfile.user_id == User.id).where(Job.employer_id == own.id)
    if q.strip():
        statement = statement.where(StudentProfile.name.contains(q.strip(), autoescape=True))
    if status:
        statement = statement.where(Application.status == status)
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.execute(statement.order_by(Application.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    response.headers['Cache-Control'] = 'no-store'
    return {'items': [{'id': app.id, 'status': app.status, 'created_at': app.created_at, 'job_id': job.id, 'job_title': job.title,
                      'applicant': {'name': profile.name, 'email': applicant.email, 'education': profile.education,
                                    'experience': profile.experience}, 'has_resume': app.resume_id is not None,
                      'next_statuses': TRANSITIONS.get(app.status, [])} for app, job, applicant, profile in rows],
            'total': total, 'page': page, 'page_size': page_size}


class StatusPatch(StrictInput):
    status: Literal['reviewing', 'shortlisted', 'accepted', 'rejected']


def own_application(application_id, user, db):
    item = db.scalar(select(Application).join(Job).join(Employer).where(Application.id == application_id, Employer.user_id == user.id).with_for_update())
    if item is None:
        raise HTTPException(404, 'Application not found')
    return item


@router.patch('/applications/{application_id}')
def change_status(application_id: int, payload: StatusPatch, user: EmployerUser, db: Database):
    item = own_application(application_id, user, db)
    if payload.status == item.status:
        return {'status': item.status}
    if payload.status not in TRANSITIONS.get(item.status, []):
        raise HTTPException(409, 'This application status transition is not allowed')
    item.status = payload.status
    db.add(Notification(user_id=item.user_id, message=f'Your application for {item.job.title[:160]} is now {item.status}.'))
    db.commit()
    return {'status': item.status}


@router.get('/applications/{application_id}/resume')
def applicant_resume(application_id: int, user: EmployerUser, db: Database):
    item = own_application(application_id, user, db)
    resume = db.get(Resume, item.resume_id) if item.resume_id else None
    if resume is None:
        raise HTTPException(404, 'No resume is attached')
    return file_response(resume)


@router.get('/analytics')
def analytics(user: EmployerUser, db: Database):
    own = company(user, db)
    counts = db.execute(select(Application.status, func.count()).join(Job).where(Job.employer_id == own.id).group_by(Application.status)).all()
    return {'jobs': db.scalar(select(func.count()).select_from(Job).where(Job.employer_id == own.id)),
            'active_jobs': db.scalar(select(func.count()).select_from(Job).where(Job.employer_id == own.id, Job.is_active.is_(True))),
            'applications': sum(count for status, count in counts), 'statuses': dict(counts)}
