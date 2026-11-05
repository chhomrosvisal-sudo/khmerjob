from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import Field, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import AdminUser, Database
from app.models import Skill, User, Employer, Job, Application, StudentProfile, Notification, AdminActivity, StudentSkill, JobSkill
from app.schemas.admin import AdminApplicationPage, AdminOverview, ApplicationStatus, DashboardAnalytics
from app.schemas.auth import StrictInput, UserOut
from app.schemas.jobs import SkillOut
import csv
from io import StringIO
from datetime import date
from app.services.admin_dashboard import dashboard_data

router = APIRouter(prefix='/api/admin', tags=['admin'])


def audit(db, actor, action, target_type, target_id, changes):
    db.add(AdminActivity(actor_id=actor.id, action=action, target_type=target_type,
                         target_id=target_id, changes=changes))


@router.get('/activity-logs')
def activity_logs(user: AdminUser, db: Database, response: Response,
                  page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                  action: str = Query('', max_length=60), actor_id: int | None = Query(None, ge=1)):
    response.headers['Cache-Control'] = 'no-store'
    statement = select(AdminActivity)
    if action:
        statement = statement.where(AdminActivity.action == action)
    if actor_id is not None:
        statement = statement.where(AdminActivity.actor_id == actor_id)
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(AdminActivity.created_at.desc(), AdminActivity.id.desc())
                      .offset((page - 1) * page_size).limit(page_size)).all()
    return {'items': [{'id': row.id, 'actor_id': row.actor_id, 'action': row.action,
                       'target_type': row.target_type, 'target_id': row.target_id,
                       'changes': row.changes, 'created_at': row.created_at} for row in rows],
            'total': total, 'page': page, 'page_size': page_size}


@router.get('/skill-gaps')
def skill_gaps(user: AdminUser, db: Database, response: Response, include_demo: bool = False):
    response.headers['Cache-Control'] = 'no-store'
    # Include active job seekers with a profile; never expose individual profiles.
    eligible = select(StudentProfile.id).join(User).where(User.role == 'student', User.is_active.is_(True))
    students = db.scalar(select(func.count()).select_from(eligible.subquery()))
    supply = dict(db.execute(select(StudentSkill.skill_id, func.count())
                  .where(StudentSkill.student_id.in_(eligible)).group_by(StudentSkill.skill_id)).all())
    conditions = [Job.is_active.is_(True), Employer.approved.is_(True)]
    if not include_demo:
        conditions.append(Job.is_demo.is_(False))
    jobs = db.scalar(select(func.count()).select_from(Job).join(Employer).where(*conditions))
    rows = db.execute(select(Skill.id, Skill.name, func.count(JobSkill.job_id))
                      .join(JobSkill).join(Job).join(Employer)
                      .where(*conditions, JobSkill.required.is_(True))
                      .group_by(Skill.id, Skill.name).order_by(func.count(JobSkill.job_id).desc(), Skill.name)).all()
    return {'students': students, 'jobs': jobs, 'include_demo': include_demo,
            'items': [{'skill_id': skill_id, 'name': name, 'jobs_requiring': demand,
                       'students_with_skill': supply.get(skill_id, 0),
                       'students_missing_skill': students - supply.get(skill_id, 0),
                       'coverage_percent': round(100 * supply.get(skill_id, 0) / students, 1) if students else None}
                      for skill_id, name, demand in rows]}


@router.get('/dashboard', response_model=DashboardAnalytics)
def dashboard(user: AdminUser, db: Database, response: Response,
              start: date | None = None, end: date | None = None):
    response.headers['Cache-Control'] = 'no-store'
    return dashboard_data(db, start, end)


@router.get('/dashboard/export')
def dashboard_export(user: AdminUser, db: Database, start: date | None = None, end: date | None = None):
    data = dashboard_data(db, start, end)
    stream = StringIO()
    writer = csv.writer(stream)
    writer.writerow(['Period', str(data['start']), str(data['end'])])
    writer.writerow(['Metric', 'Count'])
    for key in ['students', 'employers', 'verified_companies', 'active_jobs', 'applications',
                'ai_matches', 'pending_jobs', 'pending_employers']:
        writer.writerow([key, data[key] if data[key] is not None else 'Unavailable'])
    for group in ['student_registrations', 'job_postings', 'application_statuses', 'top_skills']:
        writer.writerow([group, 'Count'])
        for row in data[group]:
            label = str(row.get('month', row.get('name', '')))
            writer.writerow(["'" + label if label.startswith(('=', '+', '-', '@', '\t', '\r', '\n')) else label, row['count']])
    for note in data['notes']:
        writer.writerow(['Definition', note])
    return Response(stream.getvalue(), media_type='text/csv', headers={
        'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename=dashboard-report.csv'})


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


def overview_counts(db):
    return {'users': db.scalar(select(func.count()).select_from(User)),
            'students': db.scalar(select(func.count()).select_from(User).where(User.role == 'student')),
            'employers': db.scalar(select(func.count()).select_from(Employer)),
            'jobs': db.scalar(select(func.count()).select_from(Job)),
            'open_jobs': db.scalar(select(func.count()).select_from(Job).join(Employer).where(
                Job.is_active.is_(True), Employer.approved.is_(True))),
            'applications': db.scalar(select(func.count()).select_from(Application)),
            'skills': db.scalar(select(func.count()).select_from(Skill)),
            'pending_employers': db.scalar(select(func.count()).select_from(Employer).where(Employer.approved.is_(False))),
            'statuses': dict(db.execute(select(Application.status, func.count()).group_by(Application.status)).all())}


@router.get('/overview', response_model=AdminOverview)
def overview(user: AdminUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return overview_counts(db)


@router.get('/applications', response_model=AdminApplicationPage)
def applications(user: AdminUser, db: Database, response: Response,
                 page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100),
                 q: str = Query('', max_length=160), status: ApplicationStatus | None = None):
    response.headers['Cache-Control'] = 'no-store'
    statement = (select(Application, User, StudentProfile.name, Job, Employer)
                 .select_from(Application)
                 .join(User, User.id == Application.user_id)
                 .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
                 .join(Job, Job.id == Application.job_id)
                 .join(Employer, Employer.id == Job.employer_id))
    if q.strip():
        statement = statement.where(or_(
            User.email.contains(q.strip(), autoescape=True),
            StudentProfile.name.contains(q.strip(), autoescape=True),
            Job.title.contains(q.strip(), autoescape=True),
            Employer.name.contains(q.strip(), autoescape=True)))
    if status:
        statement = statement.where(Application.status == status)
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.execute(statement.order_by(Application.created_at.desc(), Application.id.desc())
                      .offset((page - 1) * page_size).limit(page_size)).all()
    return {'items': [
        {'id': application.id, 'applicant_id': applicant.id,
         'applicant_name': name or '', 'applicant_email': applicant.email,
         'job_id': job.id, 'job_title': job.title, 'company_name': company.name,
         'status': application.status, 'created_at': application.created_at, 'is_demo': job.is_demo}
        for application, applicant, name, job, company in rows],
        'total': total, 'page': page, 'page_size': page_size}


@router.get('/report')
def report(user: AdminUser, db: Database):
    data = overview_counts(db)
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
    before = item.is_active
    item.is_active = payload.is_active
    item.token_version += 1
    if item.role == 'employer' and not payload.is_active:
        employer = db.scalar(select(Employer).where(Employer.user_id == item.id))
        if employer is not None:
            employer.approved = False
    audit(db, user, 'user.access_changed', 'user', item.id, {'is_active': {'before': before, 'after': item.is_active}})
    db.commit()
    return {'id': item.id, 'is_active': item.is_active}


@router.get('/companies')
def all_companies(user: AdminUser, db: Database, response: Response, page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100),
                  q: str = Query('', max_length=160), pending_only: bool = False):
    response.headers['Cache-Control'] = 'no-store'
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
    item = db.scalar(select(Employer).where(Employer.id == company_id).with_for_update())
    if item is None:
        raise HTTPException(404, 'Company not found')
    account = db.get(User, item.user_id) if item.user_id else None
    if payload.approved and account is not None and not account.is_active:
        raise HTTPException(409, 'Reactivate the employer account before approving publishing')
    if item.approved == payload.approved:
        return {'id': item.id, 'approved': item.approved}
    before = item.approved
    item.approved = payload.approved
    if account is not None:
        db.add(Notification(user_id=account.id, message=(
            'Your company publishing access has been approved.' if payload.approved else
            'Your company publishing access has been suspended. Contact the administrator for details.')))
    audit(db, user, 'company.approval_changed', 'company', item.id, {'approved': {'before': before, 'after': item.approved}})
    db.commit()
    return {'id': item.id, 'approved': item.approved}


@router.get('/jobs')
def all_jobs(user: AdminUser, db: Database, response: Response, page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100), q: str = Query('', max_length=160)):
    response.headers['Cache-Control'] = 'no-store'
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
    before = job.is_active
    job.is_active = payload.is_active
    audit(db, user, 'job.access_changed', 'job', job.id, {'is_active': {'before': before, 'after': job.is_active}})
    db.commit()
    return {'id': job.id, 'is_active': job.is_active}


@router.post('/skills', response_model=SkillOut, status_code=201)
def add_skill(payload: SkillCreate, user: AdminUser, db: Database):
    if db.scalar(select(Skill.id).where(func.lower(Skill.name) == payload.name.lower())) is not None:
        raise HTTPException(409, 'Skill already exists')
    skill = Skill(**payload.model_dump())
    try:
        db.add(skill)
        db.flush()
        audit(db, user, 'skill.created', 'skill', skill.id, {'created': True})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Skill already exists') from None
    db.refresh(skill)
    return skill
