from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, db: Session):
        self.repository = UserRepository(db)

    def get_all(self):
        return self.repository.get_all()

    def get_by_id(self, user_id: int):
        user = self.repository.get_by_id(user_id)

        if not user:
            raise NotFoundException("User not found")

        return user

    def get_by_email(self, email: str):
        return self.repository.get_by_email(email)