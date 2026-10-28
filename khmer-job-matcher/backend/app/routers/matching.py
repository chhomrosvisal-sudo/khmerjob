from fastapi import APIRouter, Response, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload
from app.core.dependencies import Database, StudentUser, AdminUser
from app.models import Job, JobSkill, Skill, StudentSkill, Employer
from app.ml.matching import rank_jobs, FORMULA, LIMITATIONS
from app.ml.model import ensure_model, model_status, ModelUnavailable
from app.ml.text import profile_text
from app.routers.students import own_profile
from app.schemas.jobs import JobOut
from app.schemas.matching import MatchPage, TrainRequest, ModelMetadata

router = APIRouter(prefix='/api', tags=['matching'])


def catalog(db):
    return db.scalars(select(Job).join(Employer).where(Job.is_active.is_(True), Employer.approved.is_(True)).options(joinedload(Job.employer),
                       selectinload(Job.requirements).joinedload(JobSkill.skill)).order_by(Job.id)).all()


def fitted(jobs, **kwargs):
    try:
        return ensure_model(jobs, **kwargs)
    except ModelUnavailable as error:
        raise HTTPException(503, str(error)) from None
    except OSError:
        raise HTTPException(503, 'The matching model directory is unavailable. Check server configuration.') from None


@router.get('/match/status')
def matching_status(user: StudentUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return model_status(catalog(db))


@router.get('/admin/ml/status')
def admin_status(user: AdminUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return model_status(catalog(db))


@router.post('/admin/ml/train', response_model=ModelMetadata)
def train(payload: TrainRequest, user: AdminUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return fitted(catalog(db), force=True, engine=payload.engine).metadata()


@router.post('/match', response_model=MatchPage)
def match_jobs(user: StudentUser, db: Database, response: Response,
               page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
               min_score: float = Query(0, ge=0, le=100), job_type: str = Query('', max_length=40)):
    profile = own_profile(db, user)
    skills = db.scalars(select(Skill).join(StudentSkill).where(StudentSkill.student_id == profile.id)).all()
    jobs = catalog(db)
    model = fitted(jobs)
    ranked, engine = rank_jobs(profile, skills, jobs, model=model)
    lookup = {job.id: job for job in jobs}
    response.headers['Cache-Control'] = 'no-store'
    filtered = [item for item in ranked if item['score'] >= min_score and (not job_type or lookup[item['job_id']].job_type == job_type)]
    selected = filtered[(page - 1) * page_size:page * page_size]
    return {'items': [{**result, 'job': JobOut.model_validate(lookup[result['job_id']])} for result in selected],
            'total': len(filtered), 'page': page, 'page_size': page_size, 'engine': engine,
            'formula': FORMULA, 'limitations': LIMITATIONS, 'model': model.metadata(),
            'profile_ready': bool(skills) or bool(profile_text(profile, skills))}
