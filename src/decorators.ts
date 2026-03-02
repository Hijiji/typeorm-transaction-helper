import { AsyncLocalStorage } from 'async_hooks';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { TransactionOptions } from './index';

/**
 * Stores the current transaction context
 */
export const transactionAsyncLocalStorage = new AsyncLocalStorage<{
  manager: EntityManager;
  queryRunner: QueryRunner;
}>();

/**
 * Get the current transaction manager from context
 * Returns undefined if not in a transaction context
 */
export function getCurrentTransactionManager(): EntityManager | undefined {
  return transactionAsyncLocalStorage.getStore()?.manager;
}

/**
 * Method decorator that automatically wraps the method in a transaction
 *
 * @param options - Transaction options (isolation level, etc.)
 * @returns Method decorator function
 *
 * @example
 * ```typescript
 * class UserService {
 *   @Transaction()
 *   async createUser(data: CreateUserDto) {
 *     const userRepo = this.manager.getRepository(User);
 *     return userRepo.save(userRepo.create(data));
 *   }
 * }
 * ```
 */
export function Transaction(options?: TransactionOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // If already in a transaction, just execute the method
      if (transactionAsyncLocalStorage.getStore()) {
        return originalMethod.apply(this, args);
      }

      // Get DataSource from the service instance
      const dataSource: DataSource | undefined = (this as any).dataSource || (this as any).manager?.connection;

      if (!dataSource) {
        throw new Error(
          `@Transaction decorator requires 'dataSource' or 'manager' property on the class instance. ` +
            `Add it to your service: constructor(private dataSource: DataSource) {}`
        );
      }

      // Create query runner and start transaction
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      // Set isolation level if provided
      if (options?.isolationLevel) {
        await queryRunner.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }

      await queryRunner.startTransaction();

      try {
        // Run method within transaction context
        const result = await transactionAsyncLocalStorage.run(
          { manager: queryRunner.manager, queryRunner },
          () => originalMethod.apply(this, args)
        );

        await queryRunner.commitTransaction();
        return result;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    };

    return descriptor;
  };
}

/**
 * Method decorator that automatically wraps the method in a transaction with retry logic
 *
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 100)
 * @param options - Transaction options (isolation level, etc.)
 * @returns Method decorator function
 *
 * @example
 * ```typescript
 * class UserService {
 *   @TransactionWithRetry(3, 100)
 *   async createUserWithRetry(data: CreateUserDto) {
 *     // Automatically retries up to 3 times on failure
 *   }
 * }
 * ```
 */
export function TransactionWithRetry(maxRetries: number = 3, delayMs: number = 100, options?: TransactionOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // If already in a transaction, just execute the method
      if (transactionAsyncLocalStorage.getStore()) {
        return originalMethod.apply(this, args);
      }

      const dataSource: DataSource | undefined = (this as any).dataSource || (this as any).manager?.connection;

      if (!dataSource) {
        throw new Error(
          `@TransactionWithRetry decorator requires 'dataSource' or 'manager' property on the class instance.`
        );
      }

      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();

        if (options?.isolationLevel) {
          await queryRunner.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
        }

        await queryRunner.startTransaction();

        try {
          const result = await transactionAsyncLocalStorage.run(
            { manager: queryRunner.manager, queryRunner },
            () => originalMethod.apply(this, args)
          );

          await queryRunner.commitTransaction();
          return result;
        } catch (error) {
          await queryRunner.rollbackTransaction();
          lastError = error as Error;

          // Don't retry on last attempt
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
          }
        } finally {
          await queryRunner.release();
        }
      }

      throw lastError || new Error('Transaction failed after retries');
    };

    return descriptor;
  };
}

/**
 * Method decorator that automatically wraps the method in a transaction with timeout
 *
 * @param timeoutMs - Timeout in milliseconds
 * @param options - Transaction options (isolation level, etc.)
 * @returns Method decorator function
 *
 * @example
 * ```typescript
 * class UserService {
 *   @TransactionWithTimeout(5000)
 *   async createUserWithTimeout(data: CreateUserDto) {
 *     // Transaction must complete within 5 seconds
 *   }
 * }
 * ```
 */
export function TransactionWithTimeout(timeoutMs: number, options?: TransactionOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // If already in a transaction, just execute the method
      if (transactionAsyncLocalStorage.getStore()) {
        return originalMethod.apply(this, args);
      }

      const dataSource: DataSource | undefined = (this as any).dataSource || (this as any).manager?.connection;

      if (!dataSource) {
        throw new Error(
          `@TransactionWithTimeout decorator requires 'dataSource' or 'manager' property on the class instance.`
        );
      }

      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      if (options?.isolationLevel) {
        await queryRunner.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }

      await queryRunner.startTransaction();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      try {
        const result = await Promise.race([
          transactionAsyncLocalStorage.run({ manager: queryRunner.manager, queryRunner }, () =>
            originalMethod.apply(this, args)
          ),
          timeoutPromise,
        ]);

        await queryRunner.commitTransaction();
        return result;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    };

    return descriptor;
  };
}

export default {
  Transaction,
  TransactionWithRetry,
  TransactionWithTimeout,
  getCurrentTransactionManager,
  transactionAsyncLocalStorage,
};
