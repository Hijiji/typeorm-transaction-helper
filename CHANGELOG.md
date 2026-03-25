## [Unreleased]

### Changed

- Documentation synchronized with source and Korean explanations added

## [1.0.0] - 2026-03-25

### Added

- `AsyncLocalStorage`-based transaction context propagation (`getCurrentTransactionManager`)
- Safe timeout handling: `runInTransactionWithTimeout` ensures rollback and release on timeout
- Hardened cleanup: commit/rollback/release each handled in separate try/catch with logging
- Extended `TransactionOptions`: `timeoutMs`, `retry` (attempts, delayMs, backoff, jitter), `signal`
- `runInTransactionWithRetry` supports retry options and exponential backoff + jitter
- Korean inline documentation and README synchronization
- Unit & integration tests covering commit/rollback/retry/timeout

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible new features
- PATCH version for backwards-compatible bug fixes

[Unreleased]: https://github.com/Hijiji/typeorm-transaction-helper/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Hijiji/typeorm-transaction-helper/releases/tag/v1.0.0

- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible new features
- PATCH version for backwards-compatible bug fixes

[Unreleased]: https://github.com/Hijiji/typeorm-transaction-helper/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Hijiji/typeorm-transaction-helper/releases/tag/v0.1.0
