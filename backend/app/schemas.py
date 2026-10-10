from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Status = Literal["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
Priority = Literal["LOW", "MEDIUM", "HIGH", "URGENT"]
Category = Literal["BUG", "BILLING", "ACCESS", "OTHER"]


class TicketCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=5000)
    requester_email: EmailStr
    assignee: str = Field(default="Unassigned", max_length=120)
    category: Category = "OTHER"
    priority: Priority = "MEDIUM"
    status: Status = "OPEN"


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    requester_email: EmailStr | None = None
    assignee: str | None = Field(default=None, max_length=120)
    category: Category | None = None
    priority: Priority | None = None
    status: Status | None = None


class TicketOut(TicketCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StatsOut(BaseModel):
    total: int
    open: int
    in_progress: int
    resolved: int
    closed: int
    urgent_open: int
