"""create_organizations_and_tenant_isolation

Revision ID: 48c7e930f1a2
Revises: 17364d7162b2
Create Date: 2026-10-29 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "48c7e930f1a2"
down_revision: str | None = "17364d7162b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create organizations table
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)

    # 2. Create organization_members table
    op.create_table(
        "organization_members",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
    )
    op.create_index(
        "ix_organization_members_organization_id",
        "organization_members",
        ["organization_id"],
    )
    op.create_index(
        "ix_organization_members_user_id",
        "organization_members",
        ["user_id"],
    )

    # 3. Add organization_id foreign keys to tenant-scoped tables
    op.add_column("workflows", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.create_index("ix_workflows_organization_id", "workflows", ["organization_id"])
    op.create_foreign_key(
        "fk_workflows_organization_id",
        "workflows",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.add_column("workflow_runs", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.create_index("ix_workflow_runs_organization_id", "workflow_runs", ["organization_id"])
    op.create_foreign_key(
        "fk_workflow_runs_organization_id",
        "workflow_runs",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.add_column("approval_requests", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.create_index("ix_approval_requests_organization_id", "approval_requests", ["organization_id"])
    op.create_foreign_key(
        "fk_approval_requests_organization_id",
        "approval_requests",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.add_column("knowledge_collections", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.create_index("ix_knowledge_collections_organization_id", "knowledge_collections", ["organization_id"])
    op.create_foreign_key(
        "fk_knowledge_collections_organization_id",
        "knowledge_collections",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.add_column("evaluation_datasets", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.create_index("ix_evaluation_datasets_organization_id", "evaluation_datasets", ["organization_id"])
    op.create_foreign_key(
        "fk_evaluation_datasets_organization_id",
        "evaluation_datasets",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_evaluation_datasets_organization_id", "evaluation_datasets", type_="foreignkey")
    op.drop_index("ix_evaluation_datasets_organization_id", table_name="evaluation_datasets")
    op.drop_column("evaluation_datasets", "organization_id")

    op.drop_constraint("fk_knowledge_collections_organization_id", "knowledge_collections", type_="foreignkey")
    op.drop_index("ix_knowledge_collections_organization_id", table_name="knowledge_collections")
    op.drop_column("knowledge_collections", "organization_id")

    op.drop_constraint("fk_approval_requests_organization_id", "approval_requests", type_="foreignkey")
    op.drop_index("ix_approval_requests_organization_id", table_name="approval_requests")
    op.drop_column("approval_requests", "organization_id")

    op.drop_constraint("fk_workflow_runs_organization_id", "workflow_runs", type_="foreignkey")
    op.drop_index("ix_workflow_runs_organization_id", table_name="workflow_runs")
    op.drop_column("workflow_runs", "organization_id")

    op.drop_constraint("fk_workflows_organization_id", "workflows", type_="foreignkey")
    op.drop_index("ix_workflows_organization_id", table_name="workflows")
    op.drop_column("workflows", "organization_id")

    op.drop_index("ix_organization_members_user_id", table_name="organization_members")
    op.drop_index("ix_organization_members_organization_id", table_name="organization_members")
    op.drop_table("organization_members")

    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_table("organizations")
