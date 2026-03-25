import { DataSource, EntityManager } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Options for transaction execution
 */
/**
 * 트랜잭션 실행 옵션
 * - isolationLevel: 트랜잭션 격리 수준을 지정합니다.
 */
/**
 * 트랜잭션 실행 옵션
 */
export interface TransactionOptions {
  /**
   * 트랜잭션 격리 수준
   * @default 'READ COMMITTED'
   */
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

  /**
   * 작업 제한 시간(ms). 지정 시 내부에서 타임아웃 처리를 할 때 참고할 수 있습니다.
   */
  timeoutMs?: number;

  /**
   * 재시도 관련 옵션
   */
  retry?: {
    attempts?: number;
    delayMs?: number;
    backoff?: 'linear' | 'exponential';
    jitter?: boolean;
  };

  /**
   * 외부 취소 신호(AbortSignal). 전달 시 신호 발생 시 트랜잭션을 롤백하고 정리합니다.
   */
  signal?: AbortSignal;
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
/**
 * 주어진 작업을 트랜잭션 범위에서 실행합니다.
 * 내부에서 QueryRunner를 생성하고, 트랜잭션 시작→작업 실행→커밋/롤백→해제를 안전하게 처리합니다.
 * 이 함수는 중첩 호출 시 같은 EntityManager를 재사용할 수 있도록 AsyncLocalStorage에 현재 매니저를 설정합니다.
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

  // Run work within AsyncLocalStorage so nested calls can access the same manager
  const signal = options?.signal;
  let abortedBySignal = false;

  const onAbort = async () => {
    abortedBySignal = true;
    try {
      await queryRunner.rollbackTransaction();
    } catch (e) {
      console.warn('[transaction] rollback failed on abort:', e);
    }
    try {
      await queryRunner.release();
    } catch (e) {
      console.warn('[transaction] release failed on abort:', e);
    }
  };

  if (signal) {
    if (signal.aborted) {
      // If already aborted, clean up and throw
      await queryRunner.rollbackTransaction().catch(() => {});
      await queryRunner.release().catch(() => {});
      throw new Error('Transaction aborted before start');
    }
    // Attach listener
    signal.addEventListener('abort', onAbort);
  }

  try {
    const result = await transactionStorage.run(queryRunner.manager, async () => {
      return await work(queryRunner.manager);
    });

    // Commit in its own try/catch so commit errors don't mask the original result
    try {
      await queryRunner.commitTransaction();
    } catch (commitErr) {
      console.warn('[transaction] commit failed:', commitErr);
      try {
        await queryRunner.rollbackTransaction();
      } catch (rbErr) {
        console.warn('[transaction] rollback failed after commit error:', rbErr);
      }
      throw commitErr;
    }

    return result;
  } catch (error) {
    // Preserve original error; ensure rollback is attempted and any rollback error is logged
    try {
      await queryRunner.rollbackTransaction();
    } catch (rbErr) {
      console.warn('[transaction] rollback failed:', rbErr);
    }
    throw error;
  } finally {
    // Remove signal listener if attached
    if (signal) {
      try {
        signal.removeEventListener('abort', onAbort);
      } catch (_) {
        // ignore
      }
    }

    try {
      await queryRunner.release();
    } catch (relErr) {
      console.warn('[transaction] release failed:', relErr);
    }
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
  options?: TransactionOptions,
): Promise<T> {
  let lastError: Error | undefined;

  // allow options.retry to override function args
  if (options?.retry) {
    if (typeof options.retry.attempts === 'number') maxRetries = options.retry.attempts;
    if (typeof options.retry.delayMs === 'number') delayMs = options.retry.delayMs;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await runInTransaction(dataSource, work);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        // backoff strategy: linear by default
        let wait = delayMs * attempt;
        if (options?.retry?.backoff === 'exponential') {
          wait = delayMs * Math.pow(2, attempt - 1);
        }
        if (options?.retry?.jitter) {
          wait = Math.floor(Math.random() * wait);
        }
        await new Promise((resolve) => setTimeout(resolve, wait));
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
/**
 * 주어진 작업을 트랜잭션 범위에서 실행하되, 지정된 시간(`timeoutMs`)을 초과하면 트랜잭션을 롤백하고 에러를 던집니다.
 * 타임아웃 발생 시 `rollback`과 `release`를 보장하도록 구현되어 있어 QueryRunner 누수를 방지합니다.
 */
export async function runInTransactionWithTimeout<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  // Start transaction
  await queryRunner.startTransaction();

  let timer: NodeJS.Timeout | undefined;
  let timedOut = false;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(async () => {
      timedOut = true;
      try {
        await queryRunner.rollbackTransaction();
      } catch (_) {
        // ignore
      }
      try {
        await queryRunner.release();
      } catch (_) {
        // ignore
      }
      reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  const workPromise = (async () => {
    try {
      const result = await transactionStorage.run(queryRunner.manager, async () => {
        return await work(queryRunner.manager);
      });

      if (timedOut) {
        throw new Error(`Transaction already timed out`);
      }

      if (timer) clearTimeout(timer);

      try {
        await queryRunner.commitTransaction();
      } catch (commitErr) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (_) {
          // ignore
        }
        throw commitErr;
      }

      try {
        await queryRunner.release();
      } catch (_) {
        // ignore
      }

      return result;
    } catch (err) {
      if (!timedOut) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (_) {
          // ignore
        }
        try {
          await queryRunner.release();
        } catch (_) {
          // ignore
        }
      }
      throw err;
    }
  })();

  return Promise.race([workPromise, timeoutPromise]);
}

// 기본 내보내기: 주요 함수들을 모듈 기본으로 노출합니다.
export default {
  runInTransaction,
  runInTransactionWithRetry,
  runInTransactionWithTimeout,
};

// AsyncLocalStorage: 현재 실행 컨텍스트에서 사용 중인 EntityManager를 보관합니다.
// `runInTransaction` 내부에서 매니저를 저장하면 같은 비동기 흐름 내 하위 호출에서 재사용할 수 있습니다.
const transactionStorage = new AsyncLocalStorage<EntityManager>();

/**
 * 현재 컨텍스트에서 사용 중인 `EntityManager`를 반환합니다.
 * 트랜잭션 내부에서 호출하면 해당 트랜잭션의 매니저를 얻을 수 있고,
 * 트랜잭션 외부에서 호출하면 `undefined`를 반환합니다.
 */
export function getCurrentTransactionManager(): EntityManager | undefined {
  return transactionStorage.getStore();
}
