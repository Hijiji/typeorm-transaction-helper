import { DataSource, EntityManager } from 'typeorm';

/**
 * TypeORM 트랜잭션 헬퍼
 * 
 * QueryRunner를 사용하여 트랜잭션을 안전하게 실행합니다.
 * 자동으로 commit, rollback, release를 처리하여 코드 중복을 줄입니다.
 *
 * @param dataSource - TypeORM DataSource 인스턴스
 * @param work - 트랜잭션 내에서 실행할 작업 함수
 * @returns 작업 함수의 결과값
 * 
 * @example
 * ```typescript
 * import { runInTransaction } from '@jeongjimin/typeorm-transaction-helper';
 * 
 * const result = await runInTransaction(dataSource, async (manager) => {
 *   const userRepo = manager.getRepository(User);
 *   const user = await userRepo.save({ name: 'John' });
 *   
 *   const profileRepo = manager.getRepository(Profile);
 *   await profileRepo.save({ userId: user.id, bio: 'Developer' });
 *   
 *   return user;
 * });
 * ```
 * 
 * @throws 트랜잭션 내 작업이 실패하면 자동으로 rollback하고 에러를 throw합니다.
 */
export async function runInTransaction<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
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
 * 격리 수준을 지정할 수 있는 트랜잭션 실행 함수
 */
export type IsolationLevel =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
}

/**
 * 격리 수준을 지정하여 트랜잭션을 실행합니다.
 *
 * @param dataSource - TypeORM DataSource 인스턴스
 * @param work - 트랜잭션 내에서 실행할 작업 함수
 * @param options - 트랜잭션 옵션 (격리 수준 등)
 * @returns 작업 함수의 결과값
 * 
 * @example
 * ```typescript
 * await runInTransactionWithOptions(dataSource, async (manager) => {
 *   // 작업 수행
 * }, { isolationLevel: 'SERIALIZABLE' });
 * ```
 */
export async function runInTransactionWithOptions<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction(options?.isolationLevel);

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
