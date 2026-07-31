from sqlalchemy.orm import Session

from app.modules.identity.models import Role, User
from app.modules.notifications.models import NotificationChannel, NotificationDelivery
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService


def test_role_notification_creates_a_user_delivery_for_each_active_account(db: Session):
    role = db.query(Role).join(User, User.role_id == Role.id).filter(User.is_active.is_(True)).first()
    assert role is not None

    active_user_ids = {
        user.id
        for user in db.query(User)
        .filter(User.role_id == role.id, User.is_active.is_(True))
        .all()
    }
    event = NotificationService(db).create_event(
        NotificationEventCreate(
            event_type="role_broadcast_test",
            source_module="tests",
            recipient_role_id=role.id,
            channel=NotificationChannel.in_app,
            subject="Role broadcast",
            body="Visible to every active account in this role.",
        )
    )
    delivered_user_ids = {
        row.recipient_user_id
        for row in db.query(NotificationDelivery)
        .filter(NotificationDelivery.event_id == event.id)
        .all()
    }

    assert delivered_user_ids == active_user_ids
    assert None not in delivered_user_ids
