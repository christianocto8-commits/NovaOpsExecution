from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func

from app.core.database import Base


class TaskDraft(Base):
    __tablename__ = "task_drafts"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    outlet_id = Column(
        Integer,
        ForeignKey("outlets.id"),
        nullable=False,
        index=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    assigned_to = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    priority = Column(
        String(50),
        nullable=False,
        default="medium",
        index=True,
    )

    due_date = Column(DateTime(timezone=True), nullable=True)

    source_type = Column(String(50), nullable=True)
    source_id = Column(Integer, nullable=True)

    status = Column(
        String(50),
        nullable=False,
        default="draft",
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )