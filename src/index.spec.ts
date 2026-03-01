import { DataSource, EntityManager } from 'typeorm';
import { runInTransaction, runInTransactionWithOptions } from './index';

describe('TypeORM Transaction Helper', () => {
  let mockDataSource: jest.Mocked<DataSource>;
  let mockQueryRunner: any;
  let mockManager: jest.Mocked<EntityManager>;

  beforeEach(() => {
    mockManager = {} as jest.Mocked<EntityManager>;
    
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: mockManager,
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as any;
  });

  describe('runInTransaction', () => {
    it('should successfully execute work and commit', async () => {
      const work = jest.fn().mockResolvedValue('result');

      const result = await runInTransaction(mockDataSource, work);

      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(work).toHaveBeenCalledWith(mockManager);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should rollback on error and rethrow', async () => {
      const error = new Error('Test error');
      const work = jest.fn().mockRejectedValue(error);

      await expect(runInTransaction(mockDataSource, work)).rejects.toThrow(
        'Test error',
      );

      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should always release queryRunner even on error', async () => {
      const work = jest.fn().mockRejectedValue(new Error('Test'));

      await expect(runInTransaction(mockDataSource, work)).rejects.toThrow();

      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('runInTransactionWithOptions', () => {
    it('should execute with default options', async () => {
      const work = jest.fn().mockResolvedValue('result');

      await runInTransactionWithOptions(mockDataSource, work);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith(undefined);
    });

    it('should execute with isolation level', async () => {
      const work = jest.fn().mockResolvedValue('result');

      await runInTransactionWithOptions(mockDataSource, work, {
        isolationLevel: 'SERIALIZABLE',
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith(
        'SERIALIZABLE',
      );
    });

    it('should handle errors with options', async () => {
      const error = new Error('Test error');
      const work = jest.fn().mockRejectedValue(error);

      await expect(
        runInTransactionWithOptions(mockDataSource, work, {
          isolationLevel: 'READ COMMITTED',
        }),
      ).rejects.toThrow('Test error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });
});
