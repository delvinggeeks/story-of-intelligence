"""Flush-time guard that makes evidence events append-only.

Importing this module registers the listener. No delete path is exposed anywhere in
Phase C; retention and erasure policy is deferred to the proposed ADR-0007.
"""

from typing import Any

from sqlalchemy import event
from sqlalchemy.orm import Session

from academy_api.core.exceptions import ImmutableRecordError
from academy_api.db.models import EvidenceEvent


def _reject(action: str, instances: list[Any]) -> None:
    offending = [obj for obj in instances if isinstance(obj, EvidenceEvent)]
    if offending:
        raise ImmutableRecordError(
            f"Evidence events are append-only; refusing to {action} "
            f"{len(offending)} evidence_event row(s). Record a correcting event instead."
        )


@event.listens_for(Session, "before_flush")
def _block_evidence_mutation(session: Session, _flush_context: Any, _instances: Any) -> None:
    _reject("update", list(session.dirty))
    _reject("delete", list(session.deleted))
