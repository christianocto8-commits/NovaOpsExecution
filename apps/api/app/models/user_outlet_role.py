from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserOutletRole(Base):
    __tablename__ = "user_outlet_roles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    organization = relationship("Organization")
    outlet = relationship("Outlet")

    __table_args__ = (
        UniqueConstraint("user_id", "outlet_id", name="uq_user_outlet_role"),
    )
