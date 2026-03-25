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

### 한국어 설명

- 주요 변경사항 요약:
  - `AsyncLocalStorage` 기반 트랜잭션 컨텍스트 전파 기능(`getCurrentTransactionManager`) 추가로 중첩 호출에서 같은 `EntityManager`를 재사용할 수 있게 했습니다.
  - `runInTransactionWithTimeout`는 타임아웃 발생 시 안전하게 `rollback`과 `release`를 실행해 QueryRunner 누수를 방지합니다.
  - commit/rollback/release 단계의 예외 처리를 강화해 정리 과정에서 발생한 보조 예외는 로깅으로 남기고 원래 예외가 가려지지 않도록 처리합니다.
  - `TransactionOptions`를 확장(`timeoutMs`, `retry`, `signal`)해 다양한 운영 시나리오를 지원합니다.
  - `runInTransactionWithRetry`에 지수 백오프와 지터 옵션을 추가하여 재시도 전략을 개선했습니다.

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
