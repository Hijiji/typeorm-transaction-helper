# Contributing to TypeORM Transaction Helper

감사합니다 — 기여해 주셔서 감사합니다. 이 문서는 이 저장소에 기여하는 방법과 개발 환경 설정을 안내합니다.

## 이 저장소에 기여하는 방법 (How to contribute)

### 버그 리포트 (Reporting Bugs)

버그를 보고하기 전에 동일한 이슈가 이미 있는지 확인해 주세요.

버그를 보고할 때 포함하면 좋은 항목:

- **간단한 설명**: 어떤 문제가 발생하는지
- **재현 단계**: 문제를 재현할 수 있는 최소 단계
- **기대 동작**: 정상적으로 동작하면 어떻게 되어야 하는지
- **실제 동작**: 현재 어떻게 동작하는지
- **환경 정보**: Node 버전, TypeORM 버전, OS

### 기능 제안 (Suggesting Enhancements)

기능 제안은 환영합니다. 제안 시 포함하면 좋을 내용:

- **사용 사례**: 어떤 문제를 해결하는가
- **기대 동작**: 어떻게 동작하길 원하는가
- **구현 아이디어(선택)**: 구현 아이디어가 있다면 공유

### 풀 리퀘스트(Pull Requests)

1. 저장소를 포크하세요.
2. 브랜치를 만듭니다: `git checkout -b feature/your-feature`
3. 변경을 수행합니다.
4. 새로운 기능에는 테스트를 추가하세요.
5. 테스트 및 빌드를 실행하세요: `npm run build && npm test`
6. 명확한 커밋 메시지로 커밋하세요: `git commit -m 'feat: 설명'`
7. 브랜치를 푸시하고 PR을 엽니다.

## 개발 환경 설정 (Development Setup)

아래 명령으로 로컬 개발 환경을 준비하세요:

```bash
# 저장소 클론
git clone https://github.com/Hijiji/typeorm-transaction-helper.git
cd typeorm-transaction-helper

# 의존성 설치
npm install

# 빌드
npm run build

# 테스트
npm test

# 테스트를 watch 모드로 실행
npm run test:watch
```

## 코드 스타일 (Code Style)

- TypeScript로 작성하세요.
- 기존 스타일을 따르세요.
- 포맷: `npm run format`
- 린트: `npm run lint`

## 커밋 메시지 규칙 (Commit Messages)

권장 접두사:

- `feat:` 새로운 기능
- `fix:` 버그 수정
- `docs:` 문서 수정
- `test:` 테스트 추가/수정
- `refactor:` 리팩토링
- `chore:` 기타 유지보수

예시: `feat: add timeout support`

## 테스트 (Testing)

- 새로운 기능은 테스트를 추가하세요.
- 모든 테스트가 통과하도록 유지하세요: `npm test`
- 커버리지 확인: `npm run test:cov`

## 문서화 (Documentation)

- 사용자에게 보이는 변경은 `README.md`에 반영하세요.
- 공개 함수에는 JSDoc을 추가하세요.

## 문의 및 도움 (Questions)

이슈나 토론을 통해 질문해 주세요. 함께 해결하겠습니다.

감사합니다!
