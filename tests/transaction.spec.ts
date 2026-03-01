import { DataSource, Entity, PrimaryGeneratedColumn, Column, EntityManager } from 'typeorm';
import {
  runInTransaction,
  runInTransactionWithRetry,
  runInTransactionWithTimeout,
} from '../src/index';

/**
 * Test entity
 */
@Entity()
class TestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}

describe('Transaction Helper', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    // Initialize test database
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [TestEntity],
      synchronize: true,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('runInTransaction', () => {
    it('should execute work function within transaction', async () => {
      const result = await runInTransaction(dataSource, async (manager: EntityManager) => {
        const repo = manager.getRepository(TestEntity);
        const entity = repo.create({ name: 'Test' });
        return repo.save(entity);
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test');
    });

    it('should rollback on error', async () => {
      const initialCount = await dataSource.getRepository(TestEntity).count();

      try {
        await runInTransaction(dataSource, async (manager: EntityManager) => {
          const repo = manager.getRepository(TestEntity);
          const entity = repo.create({ name: 'Failed' });
          await repo.save(entity);
          throw new Error('Intentional error');
        });
      } catch (error) {
        // Expected error
      }

      const finalCount = await dataSource.getRepository(TestEntity).count();
      expect(finalCount).toBe(initialCount);
    });

    it('should return work function result', async () => {
      const expectedValue = 'test-result';

      const result = await runInTransaction(dataSource, async () => {
        return expectedValue;
      });

      expect(result).toBe(expectedValue);
    });
  });

  describe('runInTransactionWithRetry', () => {
    it('should retry on failure', async () => {
      let attemptCount = 0;

      try {
        await runInTransactionWithRetry(
          dataSource,
          async () => {
            attemptCount++;
            if (attemptCount < 3) {
              throw new Error('Retry this');
            }
            return 'success';
          },
          3,
          10,
        );
      } catch (error) {
        // Last error
      }

      expect(attemptCount).toBeGreaterThanOrEqual(3);
    });

    it('should succeed on retry', async () => {
      let attemptCount = 0;

      const result = await runInTransactionWithRetry(
        dataSource,
        async (manager: EntityManager) => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Retry this');
          }
          return 'success';
        },
        3,
        10,
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });
  });

  describe('runInTransactionWithTimeout', () => {
    it('should timeout on slow operation', async () => {
      await expect(
        runInTransactionWithTimeout(
          dataSource,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return 'slow';
          },
          100,
        ),
      ).rejects.toThrow('timeout');
    });

    it('should complete before timeout', async () => {
      const result = await runInTransactionWithTimeout(
        dataSource,
        async (manager: EntityManager) => {
          const repo = manager.getRepository(TestEntity);
          const entity = repo.create({ name: 'Fast' });
          return repo.save(entity);
        },
        5000,
      );

      expect(result).toBeDefined();
    });
  });
});
