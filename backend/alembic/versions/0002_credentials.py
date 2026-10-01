"""Add user credentials.

Revision ID: 0002_credentials
Revises: 0001_initial
Create Date: 2026-09-30
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_credentials"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "credentials",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("credential_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("authority", sa.String(length=120), nullable=False),
        sa.Column("license_number", sa.String(length=120), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=True),
        sa.Column("expires_at", sa.Date(), nullable=True),
        sa.Column("document_url", sa.String(length=1024), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_credentials_user_id",
        "credentials",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_credentials_user_id", table_name="credentials")
    op.drop_table("credentials")
