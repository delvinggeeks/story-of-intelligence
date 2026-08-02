class ConfigurationError(RuntimeError):
    """Raised when the service cannot resolve a required runtime location."""


class ContentNotFoundError(LookupError):
    """Raised when a requested canonical content artifact does not exist."""


class ContentIntegrityError(ValueError):
    """Raised when a canonical content artifact exists but violates its contract."""


class ImmutableRecordError(RuntimeError):
    """Raised when code attempts to modify or delete an append-only record."""


class DatabaseUnavailableError(RuntimeError):
    """Raised when the database is required but cannot be reached."""


class EvidenceContractError(ValueError):
    """Raised when an evidence event violates the ADR-0007 vocabulary or payload contract."""


class ErasureNotPermittedError(RuntimeError):
    """Raised when a privileged erasure is attempted without valid authorisation."""
