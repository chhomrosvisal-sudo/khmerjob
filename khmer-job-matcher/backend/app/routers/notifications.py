from fastapi import APIRouter, Response, HTTPException, Query
from sqlalchemy import select, update, func
from app.core.dependencies import Database, CurrentUser
from app.models import Notification

router = APIRouter(prefix='/api/notifications', tags=['notifications'])


@router.get('')
def notifications(user: CurrentUser, db: Database, response: Response,
                  unread_only: bool = False, page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=100)):
    response.headers['Cache-Control'] = 'no-store'
    statement = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        statement = statement.where(Notification.is_read.is_(False))
    return [{'id': item.id, 'message': item.message, 'is_read': item.is_read, 'created_at': item.created_at}
            for item in db.scalars(statement.order_by(Notification.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()]


@router.get('/unread-count')
def unread_count(user: CurrentUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return {'count': db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == user.id, Notification.is_read.is_(False)))}


@router.post('/read-all', status_code=204)
def read_all(user: CurrentUser, db: Database):
    db.execute(update(Notification).where(Notification.user_id == user.id,
                                         Notification.is_read.is_(False)).values(is_read=True))
    db.commit()
    return Response(status_code=204)


@router.post('/{notification_id}/read', status_code=204)
def read(notification_id: int, user: CurrentUser, db: Database):
    item = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id))
    if item is None:
        raise HTTPException(404, 'Notification not found')
    item.is_read = True
    db.commit()
    return Response(status_code=204)
