from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select
from app.core.dependencies import Database
from app.models import Employer, Job

router = APIRouter(prefix='/api/companies', tags=['companies'])


def serialize(item, count):
    return {'id': item.id, 'name': item.name, 'description': item.description, 'location': item.location,
            'website': item.website, 'is_demo': item.is_demo, 'job_count': count}


@router.get('')
def companies(db: Database, q: str = Query('', max_length=160), page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100)):
    statement = select(Employer).where(Employer.approved.is_(True))
    if q.strip():
        statement = statement.where(Employer.name.contains(q.strip(), autoescape=True))
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    items = db.scalars(statement.order_by(Employer.name).offset((page - 1) * page_size).limit(page_size)).all()
    return {'items': [serialize(item, db.scalar(select(func.count()).select_from(Job).where(Job.employer_id == item.id, Job.is_active.is_(True)))) for item in items],
            'total': total, 'page': page, 'page_size': page_size}


@router.get('/{company_id}')
def company_detail(company_id: int, db: Database):
    item = db.scalar(select(Employer).where(Employer.id == company_id, Employer.approved.is_(True)))
    if item is None:
        raise HTTPException(404, 'Company not found')
    return serialize(item, db.scalar(select(func.count()).select_from(Job).where(Job.employer_id == item.id, Job.is_active.is_(True))))
