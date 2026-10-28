from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import Database, StudentUser
from app.models import Job, SavedJob

router = APIRouter(prefix='/api/saved-jobs', tags=['saved jobs'])


@router.get('', response_model=list[int])
def saved_ids(user: StudentUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return db.scalars(select(SavedJob.job_id).where(SavedJob.user_id == user.id).order_by(SavedJob.job_id)).all()


@router.post('/{job_id}', status_code=204)
def save_job(job_id: int, user: StudentUser, db: Database):
    if db.get(Job, job_id) is None:
        raise HTTPException(404, 'Job not found')
    if db.get(SavedJob, (user.id, job_id)) is None:
        db.add(SavedJob(user_id=user.id, job_id=job_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            # A concurrent save is harmless; other failures must still surface.
            if db.get(SavedJob, (user.id, job_id)) is None:
                raise
    return Response(status_code=204)


@router.delete('/{job_id}', status_code=204)
def unsave_job(job_id: int, user: StudentUser, db: Database):
    db.execute(delete(SavedJob).where(SavedJob.user_id == user.id, SavedJob.job_id == job_id))
    db.commit()
    return Response(status_code=204)
