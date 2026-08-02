"""phase c: learner, learning session, evidence event

Creates the Phase C persistence foundation. These tables store facts only: no scoring, no
mastery state, and no derived progress. `evidence_event.kind` and `evidence_event.payload`
are intentionally opaque here; their vocabulary is the subject of proposed ADR-0007.

Revision ID: e2015fa594fe
Revises:
Create Date: 2026-08-02 14:23:54.622732
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e2015fa594fe"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learner",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_learner")),
    )
    op.create_table(
        "learning_session",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("learner_id", sa.Uuid(), nullable=False),
        sa.Column("concept_id", sa.String(length=128), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["learner_id"],
            ["learner.id"],
            name=op.f("fk_learning_session_learner_id_learner"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_learning_session")),
    )
    op.create_index(
        "ix_learning_session_learner_id_concept_id",
        "learning_session",
        ["learner_id", "concept_id"],
        unique=False,
    )
    op.create_table(
        "evidence_event",
        sa.Column("id", sa.Uuid(), nullable=False),
        # Authoritative replay order. now() is transaction-start time in PostgreSQL, so
        # timestamps alone cannot order events written inside one transaction.
        sa.Column("sequence", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["learning_session.id"],
            name=op.f("fk_evidence_event_session_id_learning_session"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_evidence_event")),
        sa.UniqueConstraint("sequence", name=op.f("uq_evidence_event_sequence")),
    )
    op.create_index(
        "ix_evidence_event_session_id_sequence",
        "evidence_event",
        ["session_id", "sequence"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_evidence_event_session_id_sequence", table_name="evidence_event")
    op.drop_table("evidence_event")
    op.drop_index("ix_learning_session_learner_id_concept_id", table_name="learning_session")
    op.drop_table("learning_session")
    op.drop_table("learner")
