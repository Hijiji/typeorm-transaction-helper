# TypeORM Transaction Helper

Simple and lightweight TypeORM transaction helper that simplifies transaction management with automatic rollback and resource cleanup.

간단하고 가벼운 TypeORM 트랜잭션 헬퍼입니다. 이 패키지는 트랜잭션 시작, 커밋, 롤백과 연결 정리를 자동으로 처리해서 트랜잭션 관련 반복 코드를 줄여줍니다. TypeORM을 쓰는 애플리케이션에서 빠르게 적용할 수 있도록 함수형 API들을 제공합니다.

[![npm version](https://img.shields.io/npm/v/typeorm-transaction-helper.svg)](https://www.npmjs.com/package/typeorm-transaction-helper)
[![npm downloads](https://img.shields.io/npm/dm/typeorm-transaction-helper.svg)](https://www.npmjs.com/package/typeorm-transaction-helper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- 간단한 함수형 API: `runInTransaction` 등 명확한 함수로 트랜잭션 범위를 지정합니다.
- 안전한 리소스 정리: 커밋/롤백/해제 단계에서 발생하는 보조 예외는 로깅만 하고 원본 예외를 보존합니다.
- 컨텍스트 전파: `AsyncLocalStorage` 기반으로 트랜잭션 내부에서 하위 호출이 같은 `EntityManager`를 재사용할 수 있습니다.
- 재시도 정책: 재시도 횟수, 지연, 백오프 방식, 지터 옵션을 지원합니다.
- 타임아웃·취소 지원: 작업별 타임아웃 및 `AbortSignal`을 통한 외부 취소를 지원합니다.
- TypeScript 친화적: 명확한 타입 정의로 안전하게 사용 가능합니다.

간단 설명: 반복되는 트랜잭션 boilerplate를 없애고, 운영환경에서 발생할 수 있는 자원 누수·재시도·타임아웃 문제를 안전하게 다루도록 설계되었습니다.

## Installation

Node.js 16 이상 환경에서 사용하는것을 권장합니다.

```bash
npm install typeorm-transaction-helper
```

or with pnpm:

```bash
pnpm add typeorm-transaction-helper
```

or with yarn:

```bash
yarn add typeorm-transaction-helper
```

## Requirements

TypeORM 0.3 이상과 Node.js 16 이상을 권장합니다.

- TypeORM >= 0.3.0
- Node.js >= 16.0.0

## Usage

이 저장소는 함수형 API(`runInTransaction`, `runInTransactionWithRetry`, `runInTransactionWithTimeout`)를 제공합니다.

### Function Approach (Flexible)

For scenarios where decorators aren't suitable, use the function API directly:

#### Basic Transaction

```typescript
import { DataSource } from 'typeorm';
import { runInTransaction, getCurrentTransactionManager } from 'typeorm-transaction-helper';

const dataSource = new DataSource({
  // ... configuration
});

// Execute within transaction
const user = await runInTransaction(dataSource, async (manager) => {
  const userRepo = manager.getRepository(User);
  const newUser = userRepo.create({
    name: 'John Doe',
    email: 'john@example.com',
  });
  return userRepo.save(newUser);
});
```

설명: `runInTransaction` 내부에서 전달된 `manager`는 `getCurrentTransactionManager()`로도 접근할 수 있습니다. 같은 비동기 흐름에서 호출되는 하위 함수가 동일한 트랜잭션 매니저를 사용해야 할 때 유용합니다.

#### With Automatic Rollback

```typescript
try {
  await runInTransaction(dataSource, async (manager) => {
    const userRepo = manager.getRepository(User);
    const user = await userRepo.save({
      name: 'Jane',
    });

    // If error occurs here, all changes are automatically rolled back
    throw new Error('Something went wrong!');
  });
} catch (error) {
  // Transaction was rolled back
  console.error('Transaction failed:', error);
}
```

#### Multiple Operations in Transaction

```typescript
const result = await runInTransaction(dataSource, async (manager) => {
  const userRepo = manager.getRepository(User);
  const postRepo = manager.getRepository(Post);

  // Both operations are in the same transaction
  const user = await userRepo.save({
    name: 'Alice',
  });

  const post = await postRepo.save({
    title: 'Hello World',
    authorId: user.id,
  });

  return { user, post };
});
```

#### With Retry Mechanism

Automatically retries on failure (useful for handling deadlocks):

```typescript
// 재시도 옵션을 사용하려면 options에 retry를 지정하거나, 함수 인수로 전달할 수 있습니다.
const user = await runInTransactionWithRetry(
  dataSource,
  async (manager) => {
    const userRepo = manager.getRepository(User);
    return userRepo.save({ name: 'Bob' });
  },
  3, // max retries (기본값)
  100, // delay between retries in ms (기본값)
  {
    retry: {
      attempts: 5,
      delayMs: 200,
      backoff: 'exponential',
      jitter: true,
    },
  },
);
```

#### With Timeout

```typescript
try {
  const user = await runInTransactionWithTimeout(
    dataSource,
    async (manager) => {
      // This must complete within 5 seconds
      const userRepo = manager.getRepository(User);
      return userRepo.save({
        name: 'Charlie',
      });
    },
    5000, // 5 second timeout
  );
} catch (error) {
  console.error('Transaction timeout:', error);
}
```

설명: `runInTransactionWithTimeout`는 내부적으로 타임아웃 발생 시 `rollback`과 `release`를 시도하여 자원 누수를 방지합니다. 별도로 `options.signal`에 `AbortSignal`을 전달하면 외부에서 취소할 수 있습니다.

#### With Transaction Options

```typescript
const result = await runInTransaction(
  dataSource,
  async (manager) => {
    // Your transaction logic
  },
  {
    isolationLevel: 'SERIALIZABLE',
  },
);
```

## API Reference

각 API 함수는 DataSource와 작업 콜백을 받아 트랜잭션 범위에서 코드를 실행합니다. 아래 시그니처를 참고하세요.

### `runInTransaction<T>()`

Executes a function within a transaction.

```typescript
function runInTransaction<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  options?: TransactionOptions,
): Promise<T>;
```

**Parameters:**

- `dataSource` - TypeORM DataSource instance
- `work` - Async function to execute within transaction
- `options` - Optional transaction options (isolationLevel, etc.)

`TransactionOptions` 상세:

- `isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE'` — 트랜잭션 격리 수준.
- `timeoutMs?: number` — 작업 제한 시간(ms). `runInTransaction`에서 직접 사용되지는 않지만, `runInTransactionWithTimeout` 혹은 상위 로직에서 참고할 수 있습니다.
- `retry?: { attempts?: number; delayMs?: number; backoff?: 'linear' | 'exponential'; jitter?: boolean }` — 재시도 관련 설정.
- `signal?: AbortSignal` — 외부 취소 신호. 전달 시 신호 발생 시 트랜잭션을 롤백하고 정리합니다.

**Returns:** Promise resolving to the result of work function

### `runInTransactionWithRetry<T>()`

Executes a function with automatic retry on failure.

```typescript
function runInTransactionWithRetry<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  maxRetries?: number, // default: 3
  delayMs?: number, // default: 100
  options?: TransactionOptions,
): Promise<T>;
```

### `runInTransactionWithTimeout<T>()`

Executes a function with a timeout limit.

```typescript
function runInTransactionWithTimeout<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  timeoutMs: number,
): Promise<T>;
```

## Examples

실제 상황에서 트랜잭션을 어떻게 적용하는지 보여주는 간단한 예제들입니다.

### Real-World: User Registration

```typescript
async function registerUser(email: string, name: string, dataSource: DataSource) {
  return runInTransactionWithRetry(
    dataSource,
    async (manager) => {
      const userRepo = manager.getRepository(User);
      const profileRepo = manager.getRepository(UserProfile);

      // Check if user already exists
      const existingUser = await userRepo.findOne({ where: { email } });
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create user
      const user = await userRepo.save({
        email,
        createdAt: new Date(),
      });

      // Create profile
      await profileRepo.save({
        userId: user.id,
        name,
      });

      return user;
    },
    3,
    100,
  );
}
```

### Real-World: Transfer Funds

```typescript
async function transferFunds(
  fromAccountId: number,
  toAccountId: number,
  amount: number,
  dataSource: DataSource,
) {
  return runInTransaction(
    dataSource,
    async (manager) => {
      const accountRepo = manager.getRepository(Account);

      // Get both accounts for update
      const fromAccount = await accountRepo.findOne({
        where: { id: fromAccountId },
      });
      const toAccount = await accountRepo.findOne({
        where: { id: toAccountId },
      });

      if (!fromAccount || !toAccount) {
        throw new Error('Account not found');
      }

      if (fromAccount.balance < amount) {
        throw new Error('Insufficient funds');
      }

      // Update both accounts
      fromAccount.balance -= amount;
      toAccount.balance += amount;

      await accountRepo.save([fromAccount, toAccount]);

      return { fromAccount, toAccount };
    },
    { isolationLevel: 'SERIALIZABLE' },
  );
}
```

## Error Handling

설명: 트랜잭션 내에서 오류가 발생하면 자동으로 롤백되며, 호출자는 예외를 받아 추가 처리를 할 수 있습니다.

The helper automatically rolls back transactions on any error:

```typescript
try {
  await runInTransaction(dataSource, async (manager) => {
    // If any error occurs here
    throw new Error('Operation failed');
  });
} catch (error) {
  // Transaction is automatically rolled back
  // error is re-thrown here
}
```

## Performance Tips

간단 팁: 트랜잭션은 가능한 짧게 유지하고, 외부 I/O는 트랜잭션 바깥에서 처리하세요. 재시도와 타임아웃 기능을 적절히 사용하면 안정성을 높일 수 있습니다.

1. **Keep transactions short** - Don't do heavy I/O operations inside transactions
2. **Use appropriate isolation levels** - Balance consistency and performance
3. **Handle deadlocks** - Use `runInTransactionWithRetry` for high-concurrency scenarios
4. **Monitor transaction duration** - Use `runInTransactionWithTimeout` for long operations

## License

MIT © 2026

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
풀 리퀘스트와 이슈 템플릿을 참고해 기여해 주세요. 작은 수정도 환영합니다.

## Support

- [Documentation](https://github.com/Hijiji/typeorm-transaction-helper) — 공식 문서 및 사용법
- [Issue Tracker](https://github.com/Hijiji/typeorm-transaction-helper/issues) — 버그 리포트 및 요청
- [Discussions](https://github.com/Hijiji/typeorm-transaction-helper/discussions) — 일반 토론과 질문

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
변경 이력과 릴리스 노트는 `CHANGELOG.md`에서 확인할 수 있습니다.

## Expected Change

- [ ] 오류로그 추가
- [ ] GitHub Releases 설정
- [ ] Badge 추가 (npm badge, license badge)
- [ ] CI/CD 설정 (.github/workflows)
- [ ] 문서 사이트 (GitHub Pages)
