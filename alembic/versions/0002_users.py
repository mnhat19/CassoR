"""add users for authentication and authorization

Revision ID: 0002_users
Revises: 0001_initial
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_users"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=100), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="employee"),
        sa.Column("employee_id", sa.Integer(), nullable=True),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("token", sa.String(length=255), nullable=True, unique=True),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
    )


def downgrade() -> None:
    op.drop_table("users")
