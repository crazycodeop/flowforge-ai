"""
Seeds multi-tenant organizations, memberships, user personas, knowledge base,
and production workflows. Safe to run repeatedly (idempotent).
"""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.organization import Organization, OrganizationMember
from app.models.user import User
from scripts.seed_workflows_and_kb import seed_knowledge_base, seed_workflows


def seed_tenants_and_users(db):
    print("--- Seeding Multi-Tenant Organizations & Users ---")

    # 1. Seed Organizations
    acme = db.scalar(select(Organization).where(Organization.slug == "acme-corp"))
    if not acme:
        acme = Organization(
            name="Acme Corporation",
            slug="acme-corp",
        )
        db.add(acme)
        db.flush()

    globex = db.scalar(select(Organization).where(Organization.slug == "globex-industries"))
    if not globex:
        globex = Organization(
            name="Globex Industries",
            slug="globex-industries",
        )
        db.add(globex)
        db.flush()

    # 2. Seed Users
    users_to_seed = [
        # Acme Corp Personas
        ("engineer@flowforge.ai", "Alex Chen (Platform Engineer)", "developer", acme.id, "admin"),
        ("architect@flowforge.ai", "Marcus Brody (Staff Architect)", "developer", acme.id, "admin"),
        (
            "manager@flowforge.ai",
            "Sarah Jenkins (Finance Operations Manager)",
            "manager",
            acme.id,
            "member",
        ),
        ("client@flowforge.ai", "David Kim (Client Requester)", "client", acme.id, "member"),
        # Globex Corp Personas
        (
            "admin@globex.com",
            "Elena Vance (Globex Lead Architect)",
            "developer",
            globex.id,
            "admin",
        ),
        (
            "manager@globex.com",
            "Marcus Vance (Globex Operations VP)",
            "manager",
            globex.id,
            "member",
        ),
        ("client@globex.com", "Victor Stone (Globex Procurement)", "client", globex.id, "member"),
    ]

    default_hash = hash_password("password123")

    for email, full_name, role, org_id, org_role in users_to_seed:
        user = db.scalar(select(User).where(User.email == email.lower()))
        if not user:
            user = User(
                email=email.lower(),
                hashed_password=default_hash,
                full_name=full_name,
                role=role,
                is_active=True,
            )
            db.add(user)
            db.flush()
        else:
            user.role = role
            user.full_name = full_name

        # Ensure membership
        member = db.scalar(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.organization_id == org_id,
            )
        )
        if not member:
            member = OrganizationMember(
                user_id=user.id,
                organization_id=org_id,
                role=org_role,
            )
            db.add(member)

    db.commit()
    print("Multi-tenant organizations and user accounts seeded successfully!")


def seed_all():
    db = SessionLocal()
    try:
        seed_tenants_and_users(db)
        seed_knowledge_base(db)
        seed_workflows(db)
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
