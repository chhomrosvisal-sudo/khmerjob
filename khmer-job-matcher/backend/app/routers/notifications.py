from fastapi import APIRouter, Response, HTTPException
from sqlalchemy import select
from app.core.dependencies import Database, CurrentUser
from app.models import Notification

router = APIRouter(prefix='/api/notifications', tags=['notifications'])


@router.get('')
def notifications(user: CurrentUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return [{'id': item.id, 'message': item.message, 'is_read': item.is_read, 'created_at': item.created_at}
            for item in db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc()).limit(100)).all()]


@router.post('/{notification_id}/read', status_code=204)
def read(notification_id: int, user: CurrentUser, db: Database):
    item = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id))
    if item is None:
        raise HTTPException(404, 'Notification not found')
    item.is_read = True
    db.commit()
    return Response(status_code=204)
