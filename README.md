# TypeORM Transaction Helper

## 소개

TypeORM Transaction Helper는 TypeORM을 사용하여 트랜잭션을 쉽게 관리할 수 있도록 도와주는 라이브러리입니다.

[![npm version](https://img.shields.io/npm/v/typeorm-transaction-helper.svg)](https://www.npmjs.com/package/typeorm-transaction-helper)
[![npm downloads](https://img.shields.io/npm/dm/typeorm-transaction-helper.svg)](https://www.npmjs.com/package/typeorm-transaction-helper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

✨ **Simple API** - Minimal boilerplate for transaction management
🔄 **Automatic Cleanup** - Handles connection cleanup automatically
🛡️ **Type-Safe** - Full TypeScript support with proper types
🔁 **Retry Support** - Built-in retry mechanism for transient failures
⏱️ **Timeout Support** - Execute transactions with timeout limits
📦 **Zero Dependencies** - Only requires TypeORM

## Installation

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

- TypeORM >= 0.3.0
- Node.js >= 16.0.0

## Usage

### Basic Transaction

```typescript
import { DataSource } from 'typeorm';
import { runInTransaction } from 'typeorm-transaction-helper';

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

### With Automatic Rollback

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

### Multiple Operations in Transaction

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

### With Retry Mechanism

Automatically retries on failure (useful for handling deadlocks):

```typescript
const user = await runInTransactionWithRetry(
  dataSource,
  async (manager) => {
    const userRepo = manager.getRepository(User);
    return userRepo.save({
      name: 'Bob',
    });
  },
  3, // max retries
  100, // delay between retries in ms
);
```

### With Timeout

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

### With Transaction Options

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

**Returns:** Promise resolving to the result of work function

### `runInTransactionWithRetry<T>()`

Executes a function with automatic retry on failure.

```typescript
function runInTransactionWithRetry<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  maxRetries?: number, // default: 3
  delayMs?: number, // default: 100
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

1. **Keep transactions short** - Don't do heavy I/O operations inside transactions
2. **Use appropriate isolation levels** - Balance consistency and performance
3. **Handle deadlocks** - Use `runInTransactionWithRetry` for high-concurrency scenarios
4. **Monitor transaction duration** - Use `runInTransactionWithTimeout` for long operations

## Testing

```bash
npm test              # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:cov     # Generate coverage report
```

## License

MIT © 2026

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Support

- 📖 [Documentation](https://github.com/Hijiji/typeorm-transaction-helper)
- 🐛 [Issue Tracker](https://github.com/Hijiji/typeorm-transaction-helper/issues)
- 💬 [Discussions](https://github.com/Hijiji/typeorm-transaction-helper/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
