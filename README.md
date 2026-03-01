# TypeORM Transaction Helper

[![npm version](https://badge.fury.io/js/%40jeongjimin%2Ftypeorm-transaction-helper.svg)](https://www.npmjs.com/package/@jeongjimin/typeorm-transaction-helper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Simple and safe TypeORM transaction helper using QueryRunner. Automatically handles commit, rollback, and resource cleanup.

## 🚀 Features

- ✅ **Simple API** - Just one function call
- ✅ **Type Safe** - Full TypeScript support
- ✅ **Auto Cleanup** - Automatic commit/rollback/release
- ✅ **Zero Dependencies** - Only TypeORM as peer dependency
- ✅ **Isolation Levels** - Support for all SQL isolation levels
- ✅ **Error Handling** - Automatic rollback on errors

## 📦 Installation

```bash
npm install @jeongjimin/typeorm-transaction-helper

# or
yarn add @jeongjimin/typeorm-transaction-helper

# or
pnpm add @jeongjimin/typeorm-transaction-helper
```

### Requirements

- TypeORM >= 0.3.0
- Node.js >= 18.0.0

## 🔧 Usage

### Basic Usage

```typescript
import { DataSource } from 'typeorm';
import { runInTransaction } from '@jeongjimin/typeorm-transaction-helper';

// Initialize your DataSource
const dataSource = new DataSource({
  // your configuration
});
await dataSource.initialize();

// Use transaction helper
const result = await runInTransaction(dataSource, async (manager) => {
  const userRepo = manager.getRepository(User);
  const user = await userRepo.save({ name: 'John Doe' });
  
  const profileRepo = manager.getRepository(Profile);
  await profileRepo.save({ userId: user.id, bio: 'Developer' });
  
  return user;
});
```

### With Isolation Level

```typescript
import { runInTransactionWithOptions } from '@jeongjimin/typeorm-transaction-helper';

await runInTransactionWithOptions(
  dataSource,
  async (manager) => {
    // Your transactional work
    const repo = manager.getRepository(Entity);
    return await repo.find();
  },
  { isolationLevel: 'SERIALIZABLE' }
);
```

### Error Handling

```typescript
try {
  await runInTransaction(dataSource, async (manager) => {
    // If any error occurs, transaction will be automatically rolled back
    await manager.getRepository(User).save(userData);
    throw new Error('Something went wrong');
  });
} catch (error) {
  console.error('Transaction failed:', error);
  // Transaction has been rolled back
}
```

## 📚 API Reference

### `runInTransaction<T>(dataSource, work)`

Executes work function within a transaction.

**Parameters:**
- `dataSource: DataSource` - TypeORM DataSource instance
- `work: (manager: EntityManager) => Promise<T>` - Function to execute within transaction

**Returns:** `Promise<T>` - Result of the work function

**Throws:** Any error from the work function (after rollback)

### `runInTransactionWithOptions<T>(dataSource, work, options)`

Executes work function within a transaction with custom options.

**Parameters:**
- `dataSource: DataSource` - TypeORM DataSource instance
- `work: (manager: EntityManager) => Promise<T>` - Function to execute within transaction
- `options?: TransactionOptions` - Transaction options
  - `isolationLevel?: IsolationLevel` - SQL isolation level

**Isolation Levels:**
- `READ UNCOMMITTED`
- `READ COMMITTED`
- `REPEATABLE READ`
- `SERIALIZABLE`

## 🤝 Why Use This?

### Without Helper (❌ Verbose)

```typescript
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  const user = await queryRunner.manager.getRepository(User).save(userData);
  await queryRunner.manager.getRepository(Profile).save(profileData);
  await queryRunner.commitTransaction();
  return user;
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

### With Helper (✅ Clean)

```typescript
return await runInTransaction(dataSource, async (manager) => {
  const user = await manager.getRepository(User).save(userData);
  await manager.getRepository(Profile).save(profileData);
  return user;
});
```

## 🧪 Testing

```bash
npm test          # Run tests
npm run test:cov  # Run tests with coverage
```

## 📝 License

MIT © Jeong Jimin

## 🐛 Issues

Found a bug? Please [open an issue](https://github.com/yourusername/typeorm-transaction-helper/issues).

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📖 Related

- [TypeORM](https://typeorm.io/) - The ORM this library is built for
- [TypeORM Transactions Documentation](https://typeorm.io/transactions)

---

Made with ❤️ by Jeong Jimin
