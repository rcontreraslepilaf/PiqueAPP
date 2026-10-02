"""Add social interactions and saved spots.

Revision ID: 0003_mvp_social_spots
Revises: 0002_credentials
Create Date: 2026-10-01
"""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography


revision = "0003_mvp_social_spots"
down_revision = "0002_credentials"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("trophy_likes"):
        op.create_table(
            "trophy_likes",
            sa.Column("trophy_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
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
                ["trophy_id"],
                ["trophies.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "trophy_id",
                "user_id",
                name="uq_trophy_likes_trophy_user",
            ),
        )
        op.create_index(
            "ix_trophy_likes_trophy_id",
            "trophy_likes",
            ["trophy_id"],
            unique=False,
        )
        op.create_index(
            "ix_trophy_likes_user_id",
            "trophy_likes",
            ["user_id"],
            unique=False,
        )

    inspector = sa.inspect(bind)
    if not inspector.has_table("trophy_comments"):
        op.create_table(
            "trophy_comments",
            sa.Column("trophy_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
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
                ["trophy_id"],
                ["trophies.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_trophy_comments_trophy_id",
            "trophy_comments",
            ["trophy_id"],
            unique=False,
        )
        op.create_index(
            "ix_trophy_comments_user_id",
            "trophy_comments",
            ["user_id"],
            unique=False,
        )

    inspector = sa.inspect(bind)
    if not inspector.has_table("spots"):
        op.create_table(
            "spots",
            sa.Column("owner_id", sa.Uuid(), nullable=False),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("spot_type", sa.String(length=60), nullable=False),
            sa.Column("visibility", sa.String(length=20), nullable=False),
            sa.Column("geo_privacy", sa.String(length=30), nullable=False),
            sa.Column(
                "exact_location",
                Geography(
                    geometry_type="POINT",
                    srid=4326,
                    spatial_index=False,
                ),
                nullable=False,
            ),
            sa.Column("exact_latitude", sa.Float(), nullable=False),
            sa.Column("exact_longitude", sa.Float(), nullable=False),
            sa.Column(
                "public_location",
                Geography(
                    geometry_type="POINT",
                    srid=4326,
                    spatial_index=False,
                ),
                nullable=True,
            ),
            sa.Column("public_latitude", sa.Float(), nullable=True),
            sa.Column("public_longitude", sa.Float(), nullable=True),
            sa.Column("public_region", sa.String(length=160), nullable=True),
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
                ["owner_id"],
                ["users.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_spots_owner_id", "spots", ["owner_id"], unique=False)
        op.create_index("ix_spots_visibility", "spots", ["visibility"], unique=False)
        op.create_index("ix_spots_public_region", "spots", ["public_region"], unique=False)
        op.create_index(
            "ix_spots_exact_location_gist",
            "spots",
            ["exact_location"],
            unique=False,
            postgresql_using="gist",
        )
        op.create_index(
            "ix_spots_public_location_gist",
            "spots",
            ["public_location"],
            unique=False,
            postgresql_using="gist",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("spots"):
        op.drop_index("ix_spots_public_location_gist", table_name="spots")
        op.drop_index("ix_spots_exact_location_gist", table_name="spots")
        op.drop_index("ix_spots_public_region", table_name="spots")
        op.drop_index("ix_spots_visibility", table_name="spots")
        op.drop_index("ix_spots_owner_id", table_name="spots")
        op.drop_table("spots")

    inspector = sa.inspect(bind)
    if inspector.has_table("trophy_comments"):
        op.drop_index("ix_trophy_comments_user_id", table_name="trophy_comments")
        op.drop_index("ix_trophy_comments_trophy_id", table_name="trophy_comments")
        op.drop_table("trophy_comments")

    inspector = sa.inspect(bind)
    if inspector.has_table("trophy_likes"):
        op.drop_index("ix_trophy_likes_user_id", table_name="trophy_likes")
        op.drop_index("ix_trophy_likes_trophy_id", table_name="trophy_likes")
        op.drop_table("trophy_likes")
