"""add payment attempts for paid radar analysis

Revision ID: 0003_payment_attempts
Revises: 0002_users
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa


revision = "0003_payment_attempts"
down_revision = "0002_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payment_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(length=100), nullable=False, unique=True),
        sa.Column("amount_vnd", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("consumed_at", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.String(length=50), nullable=False),
        sa.Column("paid_at", sa.String(length=50), nullable=True),
        sa.Column("source", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )


def downgrade() -> None:
    op.drop_table("payment_attempts")
