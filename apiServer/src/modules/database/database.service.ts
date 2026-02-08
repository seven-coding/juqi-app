/**
 * 数据库服务
 * 提供基于 Cloudbase 的数据库操作封装
 */
import { Injectable } from '@nestjs/common';
import { CloudbaseService } from '../cloudbase/cloudbase.service';

/** 查询选项 */
export interface QueryOptions {
  /** 数据环境：test | prod */
  dataEnv?: string;
  /** 分页偏移 */
  skip?: number;
  /** 分页大小 */
  limit?: number;
  /** 排序字段 */
  orderBy?: string;
  /** 排序方向 */
  orderDirection?: 'asc' | 'desc';
}

/** 查询结果 */
export interface QueryResult<T> {
  data: T[];
  total?: number;
}

@Injectable()
export class DatabaseService {
  constructor(private cloudbaseService: CloudbaseService) {}

  /**
   * 获取指定环境的数据库实例
   */
  getDatabase(dataEnv: string = 'test') {
    return this.cloudbaseService.getDatabase(dataEnv);
  }

  /**
   * 获取指定集合
   */
  collection(name: string, dataEnv: string = 'test') {
    const db = this.getDatabase(dataEnv);
    return db.collection(name);
  }

  /**
   * 查询单个文档
   */
  async findOne<T = any>(
    collectionName: string,
    query: Record<string, any>,
    dataEnv: string = 'test',
  ): Promise<T | null> {
    try {
      const db = this.getDatabase(dataEnv);
      const result = await db
        .collection(collectionName)
        .where(query)
        .limit(1)
        .get();

      return result.data && result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error(`[DatabaseService] findOne error:`, error);
      throw error;
    }
  }

  /**
   * 根据 ID 查询文档
   */
  async findById<T = any>(
    collectionName: string,
    id: string,
    dataEnv: string = 'test',
  ): Promise<T | null> {
    try {
      const db = this.getDatabase(dataEnv);
      const result = await db.collection(collectionName).doc(id).get();
      return result.data && result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error(`[DatabaseService] findById error:`, error);
      throw error;
    }
  }

  /**
   * 查询多个文档
   */
  async find<T = any>(
    collectionName: string,
    query: Record<string, any>,
    options: QueryOptions = {},
  ): Promise<QueryResult<T>> {
    try {
      const dataEnv = options.dataEnv || 'test';
      const db = this.getDatabase(dataEnv);
      let queryBuilder = db.collection(collectionName).where(query);

      // 排序
      if (options.orderBy) {
        queryBuilder = queryBuilder.orderBy(
          options.orderBy,
          options.orderDirection || 'desc',
        );
      }

      // 分页
      if (options.skip !== undefined) {
        queryBuilder = queryBuilder.skip(options.skip);
      }
      if (options.limit !== undefined) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      const result = await queryBuilder.get();

      return {
        data: result.data || [],
      };
    } catch (error) {
      console.error(`[DatabaseService] find error:`, error);
      throw error;
    }
  }

  /**
   * 查询文档数量
   */
  async count(
    collectionName: string,
    query: Record<string, any>,
    dataEnv: string = 'test',
  ): Promise<number> {
    try {
      const db = this.getDatabase(dataEnv);
      const result = await db.collection(collectionName).where(query).count();
      return result.total || 0;
    } catch (error) {
      console.error(`[DatabaseService] count error:`, error);
      throw error;
    }
  }

  /**
   * 聚合查询
   */
  async aggregate<T = any>(
    collectionName: string,
    pipeline: any[],
    dataEnv: string = 'test',
  ): Promise<T[]> {
    try {
      const db = this.getDatabase(dataEnv);
      let agg = db.collection(collectionName).aggregate();

      for (const stage of pipeline) {
        const [method, args] = Object.entries(stage)[0];
        if (typeof (agg as any)[method] === 'function') {
          agg = (agg as any)[method](args);
        }
      }

      const result = await agg.end();
      return result.list || [];
    } catch (error) {
      console.error(`[DatabaseService] aggregate error:`, error);
      throw error;
    }
  }

  /**
   * 批量获取文档（通过 ID 列表）
   */
  async findByIds<T = any>(
    collectionName: string,
    ids: string[],
    dataEnv: string = 'test',
  ): Promise<T[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    try {
      const db = this.getDatabase(dataEnv);
      const _ = db.command;
      const result = await db
        .collection(collectionName)
        .where({
          _id: _.in(ids),
        })
        .get();

      return result.data || [];
    } catch (error) {
      console.error(`[DatabaseService] findByIds error:`, error);
      throw error;
    }
  }

  /**
   * 更新单个文档
   */
  async updateOne(
    collectionName: string,
    query: Record<string, any>,
    update: Record<string, any>,
    dataEnv: string = 'test',
  ): Promise<number> {
    try {
      const db = this.getDatabase(dataEnv);
      const result = await db
        .collection(collectionName)
        .where(query)
        .update(update);
      return result.updated || 0;
    } catch (error) {
      console.error(`[DatabaseService] updateOne error:`, error);
      throw error;
    }
  }

  /**
   * 根据 ID 更新文档
   */
  async updateById(
    collectionName: string,
    id: string,
    update: Record<string, any>,
    dataEnv: string = 'test',
  ): Promise<boolean> {
    try {
      const db = this.getDatabase(dataEnv);
      const result = await db.collection(collectionName).doc(id).update(update);
      return (result.updated || 0) > 0;
    } catch (error) {
      console.error(`[DatabaseService] updateById error:`, error);
      throw error;
    }
  }

  /**
   * 新增文档
   */
  async insertOne<T = any>(
    collectionName: string,
    data: T,
    dataEnv: string = 'test',
  ): Promise<string> {
    try {
      const db = this.getDatabase(dataEnv);
      const result = await db.collection(collectionName).add(data);
      return result.id;
    } catch (error) {
      console.error(`[DatabaseService] insertOne error:`, error);
      throw error;
    }
  }

  /**
   * 删除文档
   */
  async deleteOne(
    collectionName: string,
    query: Record<string, any>,
    dataEnv: string = 'test',
  ): Promise<number> {
    try {
      const db = this.getDatabase(dataEnv);
      const result = await db.collection(collectionName).where(query).remove();
      return result.deleted || 0;
    } catch (error) {
      console.error(`[DatabaseService] deleteOne error:`, error);
      throw error;
    }
  }

  /**
   * 获取 command 操作符（如 _.inc, _.set 等）
   */
  getCommand(dataEnv: string = 'test') {
    const db = this.getDatabase(dataEnv);
    return db.command;
  }

  /**
   * 获取聚合操作符
   */
  getAggregateCommand(dataEnv: string = 'test') {
    const db = this.getDatabase(dataEnv);
    return db.command.aggregate;
  }

  /**
   * 检查环境是否可用
   */
  isEnvAvailable(dataEnv: string = 'test'): boolean {
    return this.cloudbaseService.isEnvAvailable(dataEnv);
  }
}
