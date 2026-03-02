import { DataSource, Entity, PrimaryGeneratedColumn, Column, EntityManager } from 'typeorm';
import {
  runInTransaction,
  runInTransactionWithRetry,
  runInTransactionWithTimeout,
  Transaction,
  TransactionWithRetry,
  TransactionWithTimeout,
  getCurrentTransactionManager,
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

  describe('@Transaction decorator', () => {
    class TestService {
      constructor(private dataSource: DataSource) {}

      @Transaction()
      async createEntity(name: string) {
        const manager = getCurrentTransactionManager();
        expect(manager).toBeDefined();

        const repo = manager!.getRepository(TestEntity);
        const entity = repo.create({ name });
        return repo.save(entity);
      }

      @Transaction()
      async createAndFailEntity(name: string) {
        const repo = getCurrentTransactionManager()!.getRepository(TestEntity);
        const entity = repo.create({ name });
        await repo.save(entity);
        throw new Error('Intentional error');
      }

      @Transaction()
      async createWithNestedCall(name: string) {
        // Nested call should use same transaction
        const entity1 = await this.createEntityHelper(name);
        const entity2 = await this.createEntityHelper(name + '2');
        return { entity1, entity2 };
      }

      async createEntityHelper(name: string) {
        const manager = getCurrentTransactionManager();
        expect(manager).toBeDefined();

        const repo = manager!.getRepository(TestEntity);
        const entity = repo.create({ name });
        return repo.save(entity);
      }
    }

    it('should execute method within transaction', async () => {
      const service = new TestService(dataSource);
      const result = await service.createEntity('Decorator Test');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Decorator Test');
    });

    it('should rollback on error in decorated method', async () => {
      const service = new TestService(dataSource);
      const initialCount = await dataSource.getRepository(TestEntity).count();

      try {
        await service.createAndFailEntity('Failed Entity');
      } catch (error) {
        // Expected error
      }

      const finalCount = await dataSource.getRepository(TestEntity).count();
      expect(finalCount).toBe(initialCount);
    });

    it('should share transaction in nested calls', async () => {
      const service = new TestService(dataSource);
      const result = await service.createWithNestedCall('Nested');

      expect(result.entity1).toBeDefined();
      expect(result.entity2).toBeDefined();
      expect(result.entity1.name).toBe('Nested');
      expect(result.entity2.name).toBe('Nested2');
    });
  });

  describe('@TransactionWithRetry decorator', () => {
    class RetryTestService {
      constructor(private dataSource: DataSource) {}

      @TransactionWithRetry(3, 10)
      async createWithRetry(name: string, failTimes: number) {
        const manager = getCurrentTransactionManager();
        this.attemptCount++;

        if (this.attemptCount <= failTimes) {
          throw new Error('Retry me');
        }

        const repo = manager!.getRepository(TestEntity);
        const entity = repo.create({ name });
        return repo.save(entity);
      }

      attemptCount = 0;
    }

    it('should retry and succeed', async () => {
      const service = new RetryTestService(dataSource);
      const result = await service.createWithRetry('Retry Success', 2);

      expect(result).toBeDefined();
      expect(service.attemptCount).toBe(3);
    });
  });

  describe('@TransactionWithTimeout decorator', () => {
    class TimeoutTestService {
      constructor(private dataSource: DataSource) {}

      @TransactionWithTimeout(100)
      async createWithTimeout(name: string, delayMs: number) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        const manager = getCurrentTransactionManager();
        const repo = manager!.getRepository(TestEntity);
        const entity = repo.create({ name });
        return repo.save(entity);
      }
    }

    it('should timeout on slow operation', async () => {
      const service = new TimeoutTestService(dataSource);

      await expect(service.createWithTimeout('Timeout Test', 200)).rejects.toThrow('timeout');
    });

    it('should complete within timeout', async () => {
      const service = new TimeoutTestService(dataSource);
      const result = await service.createWithTimeout('Timeout Success', 0);

      expect(result).toBeDefined();
    });
  });
});
