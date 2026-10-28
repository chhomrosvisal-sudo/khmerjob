from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import AdminUser, Database
from app.models import Skill, User, Employer, Job, Application
from app.schemas.auth import StrictInput, UserOut
from app.schemas.jobs import SkillOut
import csv
from io import StringIO

router = APIRouter(prefix='/api/admin', tags=['admin'])


class SkillCreate(StrictInput):
    name: str = Field(min_length=1, max_length=100)
    name_km: str | None = Field(default=None, max_length=150)

    @field_validator('name')
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Skill name cannot be blank')
        return value.strip()


@router.get('/users')
def users(user: AdminUser, db: Database, response: Response, page: int = Query(1, ge=1),
          page_size: int = Query(20, ge=1, le=100), q: str = Query('', max_length=160), role: str = ''):
    response.headers['Cache-Control'] = 'no-store'
    statement = select(User)
    if q.strip():
        statement = statement.where(User.email.contains(q.strip(), autoescape=True))
    if role:
        statement = statement.where(User.role == role)
    items = db.scalars(statement.order_by(User.id).offset((page - 1) * page_size).limit(page_size)).all()
    return {'items': [{**UserOut.model_validate(item).model_dump(), 'is_active': item.is_active} for item in items],
            'total': db.scalar(select(func.count()).select_from(statement.subquery())), 'page': page, 'page_size': page_size}


@router.get('/overview')
def overview(user: AdminUser, db: Database):
    return {'users': db.scalar(select(func.count()).select_from(User)),
            'employers': db.scalar(select(func.count()).select_from(Employer)),
            'jobs': db.scalar(select(func.count()).select_from(Job)),
            'applications': db.scalar(select(func.count()).select_from(Application)),
            'pending_employers': db.scalar(select(func.count()).select_from(Employer).where(Employer.approved.is_(False))),
            'statuses': dict(db.execute(select(Application.status, func.count()).group_by(Application.status)).all())}


@router.get('/report')
def report(user: AdminUser, db: Database):
    data = overview(user, db)
    stream = StringIO()
    writer = csv.writer(stream)
    writer.writerow(['Metric', 'Count'])
    for key in ['users', 'employers', 'jobs', 'applications', 'pending_employers']:
        writer.writerow([key, data[key]])
    for status, count in data['statuses'].items():
        writer.writerow(['application_status_' + ''.join(char for char in status if char.isalnum() or char == '_'), count])
    return Response(stream.getvalue(), media_type='text/csv', headers={'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename=portal-report.csv'})


class ActivePatch(StrictInput):
    is_active: bool


@router.patch('/users/{user_id}')
def user_state(user_id: int, payload: ActivePatch, user: AdminUser, db: Database):
    item = db.get(User, user_id)
    if item is None:
        raise HTTPException(404, 'User not found')
    if item.id == user.id and not payload.is_active:
        raise HTTPException(409, 'You cannot disable your own admin account')
    if item.role == 'admin' and not payload.is_active:
        raise HTTPException(409, 'Administrator accounts are managed by the database operator')
    item.is_active = payload.is_active
    item.token_version += 1
    if item.role == 'employer' and not payload.is_active:
        employer = db.scalar(select(Employer).where(Employer.user_id == item.id))
        if employer is not None:
            employer.approved = False
    db.commit()
    return {'id': item.id, 'is_active': item.is_active}


@router.get('/companies')
def all_companies(user: AdminUser, db: Database, page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100),
                  q: str = Query('', max_length=160), pending_only: bool = False):
    statement = select(Employer)
    if q.strip():
        statement = statement.where(Employer.name.contains(q.strip(), autoescape=True))
    if pending_only:
        statement = statement.where(Employer.approved.is_(False))
    items = db.scalars(statement.order_by(Employer.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {'items': [{'id': item.id, 'name': item.name, 'approved': item.approved, 'is_demo': item.is_demo} for item in items],
            'total': db.scalar(select(func.count()).select_from(statement.subquery())), 'page': page, 'page_size': page_size}


class ApprovalPatch(StrictInput):
    approved: bool


@router.patch('/companies/{company_id}')
def approve_company(company_id: int, payload: ApprovalPatch, user: AdminUser, db: Database):
    item = db.get(Employer, company_id)
    if item is None:
        raise HTTPException(404, 'Company not found')
    item.approved = payload.approved
    db.commit()
    return {'id': item.id, 'approved': item.approved}


@router.get('/jobs')
def all_jobs(user: AdminUser, db: Database, page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100), q: str = Query('', max_length=160)):
    statement = select(Job)
    if q.strip():
        statement = statement.where(Job.title.contains(q.strip(), autoescape=True))
    items = db.scalars(statement.order_by(Job.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {'items': [{'id': item.id, 'title': item.title, 'company': item.employer.name, 'is_active': item.is_active, 'is_demo': item.is_demo} for item in items],
            'total': db.scalar(select(func.count()).select_from(statement.subquery())), 'page': page, 'page_size': page_size}


@router.patch('/jobs/{job_id}')
def moderate_job(job_id: int, payload: ActivePatch, user: AdminUser, db: Database):
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(404, 'Job not found')
    job.is_active = payload.is_active
    db.commit()
    return {'id': job.id, 'is_active': job.is_active}


@router.post('/skills', response_model=SkillOut, status_code=201)
def add_skill(payload: SkillCreate, user: AdminUser, db: Database):
    skill = Skill(**payload.model_dump())
    try:
        db.add(skill)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Skill already exists') from None
    db.refresh(skill)
    return skill
