from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.db.session import get_db
from app.models import Employer, Job, JobSkill, SavedJob, Skill
from app.schemas.jobs import JobOut, JobPage, SkillOut
from app.schemas.jobs import JobCreate, JobPatch
from app.core.dependencies import EmployerUser, OptionalUser

router = APIRouter(prefix='/api', tags=['catalog'])
Database = Annotated[Session, Depends(get_db)]


@router.get('/jobs', response_model=JobPage)
def list_jobs(db: Database, user: OptionalUser, response: Response, q: str = Query('', max_length=160),
              location: str | None = Query(None, max_length=100),
              job_type: str | None = Query(None, max_length=40),
              page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
              saved_only: bool = False, owned_only: bool = False,
              company_id: int | None = Query(None, gt=0), category: str | None = Query(None, max_length=80)):
    statement = select(Job).join(Employer)
    if not owned_only:
        statement = statement.where(Job.is_active.is_(True), Employer.approved.is_(True))
    if company_id is not None:
        statement = statement.where(Job.employer_id == company_id)
    if category:
        statement = statement.where(Job.category == category)
    if user is not None:
        response.headers['Cache-Control'] = 'no-store'
    if saved_only:
        if user is None:
            raise HTTPException(401, 'Sign in to view saved jobs', headers={'WWW-Authenticate': 'Bearer'})
        if user.role != 'student':
            raise HTTPException(403, 'Saved jobs are available to students')
        statement = statement.join(SavedJob).where(SavedJob.user_id == user.id)
    if owned_only:
        if user is None:
            raise HTTPException(401, 'Sign in to view your jobs', headers={'WWW-Authenticate': 'Bearer'})
        if user.role != 'employer':
            raise HTTPException(403, 'Owned jobs are available to employers')
        statement = statement.where(Employer.user_id == user.id)
    if q.strip():
        statement = statement.where(or_(Job.title.contains(q.strip(), autoescape=True),
                                       Employer.name.contains(q.strip(), autoescape=True)))
    if location:
        statement = statement.where(Job.location == location)
    if job_type:
        statement = statement.where(Job.job_type == job_type)
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    items = db.scalars(statement.options(joinedload(Job.employer),
                       selectinload(Job.requirements).joinedload(JobSkill.skill))
                       .order_by(Job.id).offset((page - 1) * page_size).limit(page_size)).all()
    return {'items': items, 'total': total, 'page': page, 'page_size': page_size}


@router.get('/jobs/{job_id}', response_model=JobOut)
def job_detail(job_id: int, db: Database):
    job = db.scalar(select(Job).where(Job.id == job_id).options(
        joinedload(Job.employer), selectinload(Job.requirements).joinedload(JobSkill.skill)))
    if job is None:
        raise HTTPException(404, 'Job not found')
    return job


@router.get('/skills', response_model=list[SkillOut])
def list_skills(db: Database):
    return db.scalars(select(Skill).order_by(Skill.name)).all()


def validate_requirements(db, requirements):
    ids = {item['skill_id'] for item in requirements}
    if set(db.scalars(select(Skill.id).where(Skill.id.in_(ids))).all()) != ids:
        raise HTTPException(422, 'Unknown skill IDs')


@router.post('/jobs', response_model=JobOut, status_code=201)
def create_job(payload: JobCreate, user: EmployerUser, db: Database):
    employer = db.scalar(select(Employer).where(Employer.user_id == user.id))
    if employer is None:
        raise HTTPException(403, 'Employer profile not configured')
    if not employer.approved:
        raise HTTPException(403, 'Your employer account is awaiting administrator approval')
    data = payload.model_dump()
    requirements = data.pop('requirements')
    validate_requirements(db, requirements)
    job = Job(employer_id=employer.id, **data, is_demo=False)
    job.requirements = [JobSkill(**item) for item in requirements]
    db.add(job)
    db.commit()
    return job_detail(job.id, db)


@router.patch('/jobs/{job_id}', response_model=JobOut)
def update_job(job_id: int, payload: JobPatch, user: EmployerUser, db: Database):
    # Filter ownership in the query; foreign IDs and missing IDs both return 404.
    job = db.scalar(select(Job).join(Employer).where(Job.id == job_id, Employer.user_id == user.id))
    if job is None:
        raise HTTPException(404, 'Job not found')
    data = payload.model_dump(exclude_unset=True)
    if 'requirements' in data:
        requirements = data.pop('requirements')
        validate_requirements(db, requirements)
        job.requirements.clear()
        db.flush()  # Delete old composite keys before inserting replacements.
        job.requirements = [JobSkill(**item) for item in requirements]
    for key, value in data.items():
        setattr(job, key, value)
    if job.salary_min is not None and job.salary_max is not None and job.salary_max < job.salary_min:
        raise HTTPException(422, 'Maximum salary must be at least the minimum salary')
    db.commit()
    return job_detail(job.id, db)


from app.schemas.auth import StrictInput


class JobState(StrictInput):
    is_active: bool


@router.patch('/jobs/{job_id}/state', response_model=JobOut)
def job_state(job_id: int, payload: JobState, user: EmployerUser, db: Database):
    job = db.scalar(select(Job).join(Employer).where(Job.id == job_id, Employer.user_id == user.id))
    if job is None:
        raise HTTPException(404, 'Job not found')
    if payload.is_active and not job.employer.approved:
        raise HTTPException(403, 'Employer approval is required to reopen jobs')
    job.is_active = payload.is_active
    db.commit()
    return job_detail(job.id, db)
