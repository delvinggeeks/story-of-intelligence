class ConfigurationError(RuntimeError):
    """Raised when the service cannot resolve a required runtime location."""


class ContentNotFoundError(LookupError):
    """Raised when a requested canonical content artifact does not exist."""


class ContentIntegrityError(ValueError):
    """Raised when a canonical content artifact exists but violates its contract."""
