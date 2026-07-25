from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    future=True,
    connect_args={"connect_timeout": 15},
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# SQLAlchemy model registry for Alembic autogenerate
from app.models.organization import Organization  # noqa: E402,F401
from app.models.role import Role  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
from app.models.outlet import Outlet  # noqa: E402,F401
from app.models.user_outlet_role import UserOutletRole  # noqa: E402,F401

from app.models.form_template import FormTemplate  # noqa: E402,F401
from app.models.form_field import FormField  # noqa: E402,F401
from app.models.form_schedule import FormSchedule  # noqa: E402,F401
from app.models.form_submission import FormSubmission  # noqa: E402,F401
from app.models.form_answer import FormAnswer  # noqa: E402,F401

from app.models.runtime_template import RuntimeTemplate  # noqa: E402,F401
from app.models.builder_document import BuilderDocument  # noqa: E402,F401
from app.models.execution_session import ExecutionSession  # noqa: E402,F401

from app.models.task import Task  # noqa: E402,F401
from app.models.task_comment import TaskComment  # noqa: E402,F401
from app.models.task_assignment import TaskAssignment  # noqa: E402,F401
from app.models.task_draft import TaskDraft  # noqa: E402,F401
from app.models.task_schedule_exception import TaskScheduleException  # noqa: E402,F401
from app.models.scheduler_job_run import SchedulerJobRun  # noqa: E402,F401
from app.models.app_settings import AppSettings  # noqa: E402,F401
