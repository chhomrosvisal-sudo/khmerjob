from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Employer, Job
from app.seed_more_jobs import EXTRA_JOBS, add_jobs


def test_add_twenty_jobs_preserves_existing_records_and_is_repeatable(engine):
    with Session(engine) as db, db.begin():
        original_ids = set(db.scalars(select(Job.id)))
        companies = db.scalar(select(func.count()).select_from(Employer))
        add_jobs(db)
        db.flush()
        assert db.scalar(select(func.count()).select_from(Job)) == len(original_ids) + 20
        assert db.scalar(select(func.count()).select_from(Employer)) == companies
        for key, *_ in EXTRA_JOBS:
            job = db.scalar(select(Job).where(Job.demo_key == f'initial-{key}'))
            assert job.is_demo and job.is_active
            assert job.description.startswith('DEMONSTRATION ONLY')
            assert job.requirements
        add_jobs(db)
        db.flush()
        assert db.scalar(select(func.count()).select_from(Job)) == len(original_ids) + 20
        assert original_ids.issubset(set(db.scalars(select(Job.id))))
