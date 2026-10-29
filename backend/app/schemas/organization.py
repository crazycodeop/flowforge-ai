from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.organization import OrganizationRole


class OrgCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    slug: str | None = Field(default=None, max_length=128)


class OrgUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=128)


class OrgMemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str | None = None
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrgMemberAdd(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    role: OrganizationRole = Field(default=OrganizationRole.BUILDER)


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    role: str | None = None
    member_count: int = 1
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
