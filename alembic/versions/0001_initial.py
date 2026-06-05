"""create core tables

Revision ID: 0001_initial
Revises: 
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expertises",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=10), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("group_name", sa.String(length=100), nullable=False),
        sa.Column("segment", sa.String(length=50), nullable=False),
        sa.Column("flag", sa.String(length=10), nullable=False),
        sa.Column("enable", sa.Boolean(), nullable=False),
        sa.Column("ceiling_prof", sa.String(length=10), nullable=True),
    )

    op.create_table(
        "titles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("vietnamese", sa.String(length=255), nullable=True),
        sa.Column("expertise_code", sa.String(length=10), nullable=True),
        sa.Column("expertise_name", sa.String(length=255), nullable=True),
        sa.Column("expertise_group", sa.String(length=100), nullable=True),
        sa.Column("expertise_segment", sa.String(length=50), nullable=True),
        sa.Column("track", sa.String(length=50), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["expertise_code"], ["expertises.code"]),
    )

    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.String(length=50), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=100), nullable=True),
        sa.Column("raw_title", sa.String(length=255), nullable=True),
        sa.Column("role_track", sa.String(length=50), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("expertise_group", sa.String(length=100), nullable=True),
        sa.Column("expertise_segment", sa.String(length=50), nullable=True),
        sa.Column("training_source", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("employees")
    op.drop_table("titles")
    op.drop_table("expertises")
