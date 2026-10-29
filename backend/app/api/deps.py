import re
import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.organization import Organization, OrganizationMember, OrganizationRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> User | None:
    """Extracts and verifies current user from bearer token. Returns None if unauthenticated."""
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    user_id = payload["sub"]
    user = db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    return user


def require_user(user: Annotated[User | None, Depends(get_current_user)]) -> User:
    """Enforces authentication; raises 401 Unauthorized if not authenticated."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(allowed_roles: list[str]) -> Callable[[User], User]:
    """Factory creating dependency to check platform-level user role permissions."""

    def role_dependency(user: Annotated[User, Depends(require_user)]) -> User:
        if user.role not in allowed_roles and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {allowed_roles}. Current role: '{user.role}'.",
            )
        return user

    return role_dependency


class TenantContext:
    """Context holding the authenticated user, active tenant organization, and member role."""

    def __init__(self, user: User, org: Organization, membership: OrganizationMember):
        self.user = user
        self.org = org
        self.membership = membership
        self.role = membership.role


def get_or_create_default_org(user: User, db: Session) -> tuple[Organization, OrganizationMember]:
    """Ensures a user has at least one default organization and returns it."""
    # Look for existing membership
    stmt = (
        select(Organization, OrganizationMember)
        .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
        .where(OrganizationMember.user_id == user.id)
        .order_by(OrganizationMember.created_at.asc())
    )
    result = db.execute(stmt).first()
    if result:
        return result[0], result[1]

    # Create default personal organization
    base_name = user.full_name or user.email.split("@")[0]
    slug_base = re.sub(r"[^a-zA-Z0-9-]", "", base_name.lower().replace(" ", "-")) or "workspace"
    unique_slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    org = Organization(name=f"{base_name}'s Workspace", slug=unique_slug)
    db.add(org)
    db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role=OrganizationRole.OWNER.value,
    )
    db.add(member)
    db.commit()
    db.refresh(org)
    db.refresh(member)
    return org, member


def get_tenant_context(
    user: Annotated[User, Depends(require_user)],
    x_organization_id: Annotated[str | None, Header(alias="X-Organization-ID")] = None,
    db: Session = Depends(get_db),
) -> TenantContext:
    """Resolves and validates the active organization context for the authenticated user."""
    if x_organization_id:
        # Check membership in the explicitly requested organization
        stmt = (
            select(Organization, OrganizationMember)
            .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
            .where(
                Organization.id == x_organization_id,
                OrganizationMember.user_id == user.id,
            )
        )
        row = db.execute(stmt).first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You are not a member of organization '{x_organization_id}'.",
            )
        return TenantContext(user=user, org=row[0], membership=row[1])

    # Default to user's first/default organization
    org, member = get_or_create_default_org(user, db)
    return TenantContext(user=user, org=org, membership=member)


def get_optional_tenant_context(
    user: Annotated[User | None, Depends(get_current_user)],
    x_organization_id: Annotated[str | None, Header(alias="X-Organization-ID")] = None,
    db: Session = Depends(get_db),
) -> TenantContext | None:
    """Optional tenant context; returns None if unauthenticated."""
    if not user:
        return None
    return get_tenant_context(user=user, x_organization_id=x_organization_id, db=db)


def require_org_role(allowed_roles: list[OrganizationRole]) -> Callable[[TenantContext], TenantContext]:
    """Dependency verifying that the user holds an authorized role within the active organization."""
    allowed_values = [r.value for r in allowed_roles]

    def checker(tenant: Annotated[TenantContext, Depends(get_tenant_context)]) -> TenantContext:
        if tenant.membership.role != OrganizationRole.OWNER.value and tenant.membership.role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires organization role in {allowed_values}. Your role is '{tenant.membership.role}'.",
            )
        return tenant

    return checker
