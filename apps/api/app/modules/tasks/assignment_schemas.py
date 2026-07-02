from datetime import datetime
from pydantic import BaseModel, EmailStr


class TaskAssigneeUserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role_name: str | None = None

    model_config = {"from_attributes": True}


class TaskAssignmentCreate(BaseModel):
    user_id: int
    role: str = "assignee"


class TaskAssignmentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    assigned_by: int | None = None
    role: str
    created_at: datetime
    user: TaskAssigneeUserResponse | None = None

    model_config = {"from_attributes": True}