import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.core.database import get_db
from app.models.organization import Organization, OrganizationMember, OrganizationRole
from app.models.user import User
from app.schemas.organization import (
    OrgCreate,
    OrgMemberAdd,
    OrgMemberResponse,
    OrgResponse,
    OrgUpdate,
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("", response_model=list[OrgResponse], summary="List user organizations")
def list_user_organizations(
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> list[OrgResponse]:
    """Returns all organizations the authenticated user belongs to with member counts and user role."""
    stmt = (
        select(
            Organization,
            OrganizationMember.role,
            func.count(OrganizationMember.id).over(partition_by=Organization.id).label("total_members"),
        )
        .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
        .where(OrganizationMember.user_id == user.id)
        .order_by(Organization.created_at.asc())
    )
    rows = db.execute(stmt).all()
    if not rows:
        from app.api.deps import get_or_create_default_org

        org, mem = get_or_create_default_org(user, db)
        return [
            OrgResponse(
                id=org.id,
                name=org.name,
                slug=org.slug,
                role=mem.role,
                member_count=1,
                created_at=org.created_at,
                updated_at=org.updated_at,
            )
        ]

    results = []
    for org, user_role, count in rows:
        results.append(
            OrgResponse(
                id=org.id,
                name=org.name,
                slug=org.slug,
                role=user_role,
                member_count=count or 1,
                created_at=org.created_at,
                updated_at=org.updated_at,
            )
        )
    return results


@router.post("", response_model=OrgResponse, status_code=status.HTTP_201_CREATED, summary="Create an organization")
def create_organization(
    payload: OrgCreate,
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> OrgResponse:
    """Creates a new organization tenant and designates the creator as the Owner."""
    slug_base = (
        payload.slug
        or re.sub(r"[^a-zA-Z0-9-]", "", payload.name.lower().replace(" ", "-"))
        or "org"
    )
    unique_slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    org = Organization(name=payload.name, slug=unique_slug)
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

    return OrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        role=OrganizationRole.OWNER.value,
        member_count=1,
        created_at=org.created_at,
        updated_at=org.updated_at,
    )


@router.get("/{org_id}", response_model=OrgResponse, summary="Get organization details")
def get_organization(
    org_id: str,
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> OrgResponse:
    """Retrieves organization details if the user is an authorized member."""
    stmt = (
        select(Organization, OrganizationMember.role)
        .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
        .where(Organization.id == org_id, OrganizationMember.user_id == user.id)
    )
    row = db.execute(stmt).first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization '{org_id}' not found or you are not a member.",
        )
    org, user_role = row

    member_count = db.scalar(
        select(func.count(OrganizationMember.id)).where(OrganizationMember.organization_id == org.id)
    ) or 1

    return OrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        role=user_role,
        member_count=member_count,
        created_at=org.created_at,
        updated_at=org.updated_at,
    )


@router.put("/{org_id}", response_model=OrgResponse, summary="Update organization")
def update_organization(
    org_id: str,
    payload: OrgUpdate,
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> OrgResponse:
    """Updates organization name. Requires Owner or Admin role."""
    stmt = select(OrganizationMember).where(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user.id,
    )
    membership = db.scalar(stmt)
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    if membership.role not in [OrganizationRole.OWNER.value, OrganizationRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Updating organization settings requires Owner or Admin role.",
        )

    org = db.get(Organization, org_id)
    if payload.name:
        org.name = payload.name
    db.commit()
    db.refresh(org)

    member_count = db.scalar(
        select(func.count(OrganizationMember.id)).where(OrganizationMember.organization_id == org.id)
    ) or 1

    return OrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        role=membership.role,
        member_count=member_count,
        created_at=org.created_at,
        updated_at=org.updated_at,
    )


@router.get("/{org_id}/members", response_model=list[OrgMemberResponse], summary="List organization members")
def list_org_members(
    org_id: str,
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> list[OrgMemberResponse]:
    """Lists all members of the organization."""
    # Verify user is a member
    user_mem = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
        )
    )
    if not user_mem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    stmt = (
        select(OrganizationMember, User)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.organization_id == org_id)
        .order_by(OrganizationMember.created_at.asc())
    )
    rows = db.execute(stmt).all()

    return [
        OrgMemberResponse(
            id=mem.id,
            user_id=usr.id,
            email=usr.email,
            full_name=usr.full_name,
            role=mem.role,
            created_at=mem.created_at,
        )
        for mem, usr in rows
    ]


@router.post("/{org_id}/members", response_model=OrgMemberResponse, status_code=status.HTTP_201_CREATED, summary="Add member to organization")
def add_org_member(
    org_id: str,
    payload: OrgMemberAdd,
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> OrgMemberResponse:
    """Adds a member to the organization by email. Requires Owner or Admin role."""
    user_mem = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
        )
    )
    if not user_mem or user_mem.role not in [OrganizationRole.OWNER.value, OrganizationRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adding members requires Owner or Admin role in this organization.",
        )

    target_user = db.scalar(select(User).where(User.email == payload.email))
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{payload.email}' does not exist on FlowForge AI. They must sign up first.",
        )

    # Check if already a member
    existing = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == target_user.id,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User '{payload.email}' is already a member of this organization with role '{existing.role}'.",
        )

    member = OrganizationMember(
        organization_id=org_id,
        user_id=target_user.id,
        role=payload.role.value,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return OrgMemberResponse(
        id=member.id,
        user_id=target_user.id,
        email=target_user.email,
        full_name=target_user.full_name,
        role=member.role,
        created_at=member.created_at,
    )


@router.delete("/{org_id}/members/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove member")
def remove_org_member(
    org_id: str,
    target_user_id: str,
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
):
    """Removes a member from the organization. Requires Owner or Admin role."""
    user_mem = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
        )
    )
    if not user_mem or user_mem.role not in [OrganizationRole.OWNER.value, OrganizationRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Removing members requires Owner or Admin role in this organization.",
        )

    target_mem = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == target_user_id,
        )
    )
    if not target_mem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in organization.")

    if target_mem.role == OrganizationRole.OWNER.value and user_mem.user_id != target_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot remove the organization Owner.")

    db.delete(target_mem)
    db.commit()
    return None
