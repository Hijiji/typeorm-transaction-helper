import { DataSource, EntityManager } from 'typeorm';

/**
 * Options for transaction execution
 */
export interface TransactionOptions {
  /**
   * Isolation level for the transaction
   * @default 'READ COMMITTED'
   */
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
}

/**
 * Executes a function within a TypeORM transaction.
 *
 * This helper simplifies transaction management by handling connection,
 * transaction start, commit/rollback, and cleanup automatically.
 *
 * @template T - The return type of the work function
 * @param dataSource - TypeORM DataSource instance
 * @param work - Async function to execute within transaction
 * @param options - Optional transaction options
 * @returns Promise resolving to the result of work function
 *
 * @example
 * ```typescript
 * const user = await runInTransaction(dataSource, async (manager) => {
 *   const userRepo = manager.getRepository(User);
 *   const newUser = userRepo.create({ name: 'John' });
 *   return userRepo.save(newUser);
 * });
 * ```
 *
 * @throws Rethrows any error thrown by the work function
 */
export async function runInTransaction<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  // Start transaction with optional isolation level
  if (options?.isolationLevel) {
    await queryRunner.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
  }
  await queryRunner.startTransaction();

  try {
    const result = await work(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Executes a function within a transaction with automatic retry on failure.
 *
 * Useful for handling transient errors and deadlock scenarios.
 *
 * @template T - The return type of the work function
 * @param dataSource - TypeORM DataSource instance
 * @param work - Async function to execute within transaction
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 100)
 * @returns Promise resolving to the result of work function
 *
 * @example
 * ```typescript
 * const result = await runInTransactionWithRetry(
 *   dataSource,
 *   async (manager) => {
 *     // Your transaction logic
 *   },
 *   3,  // max retries
 *   100 // delay between retries
 * );
 * ```
 */
export async function runInTransactionWithRetry<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await runInTransaction(dataSource, work);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Executes a function within a transaction with a timeout.
 *
 * @template T - The return type of the work function
 * @param dataSource - TypeORM DataSource instance
 * @param work - Async function to execute within transaction
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise resolving to the result of work function
 * @throws Throws TimeoutError if transaction exceeds timeout
 *
 * @example
 * ```typescript
 * const result = await runInTransactionWithTimeout(
 *   dataSource,
 *   async (manager) => {
 *     // Your transaction logic
 *   },
 *   5000 // 5 second timeout
 * );
 * ```
 */
export async function runInTransactionWithTimeout<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([runInTransaction(dataSource, work), timeoutPromise]);
}

export { Transaction, TransactionWithRetry, TransactionWithTimeout, getCurrentTransactionManager } from './decorators';

export default {
  runInTransaction,
  runInTransactionWithRetry,
  runInTransactionWithTimeout,
};
