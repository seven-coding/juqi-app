import { Injectable } from '@nestjs/common';
import * as tcb from '@cloudbase/node-sdk';
import { ConfigService } from '@nestjs/config';

/** 环境 ID 常量 */
const TEST_ENV_ID = 'test-juqi-3g1m5qa7cc2737a1';
const PROD_ENV_ID = 'prod-juqi-7glu2m8qfa31e13f';

@Injectable()
export class CloudbaseService {
  /** 测试环境 Cloudbase 实例 */
  private testCloudbase: any;
  /** 生产环境 Cloudbase 实例 */
  private prodCloudbase: any;
  
  /** 默认 Cloudbase 实例（兼容旧代码） */
  public cloudbase: any;
  /** 当前是否对正式环境为只读 */
  public readonly isProdReadOnly: boolean;

  /** 测试环境 ID */
  public readonly testEnvId: string;
  /** 生产环境 ID */
  public readonly prodEnvId: string;

  constructor(private configService: ConfigService) {
    const nodeEnv = this.configService.get('NODE_ENV') || 'production';

    // 获取环境 ID
    this.testEnvId = this.configService.get('TCB_ENV_TEST') ||
                     this.configService.get('TEST_ENV_ID') ||
                     TEST_ENV_ID;
    this.prodEnvId = this.configService.get('TCB_ENV_PROD') ||
                     this.configService.get('PROD_ENV_ID') ||
                     PROD_ENV_ID;

    // 获取测试环境凭证
    const testSecretId = this.cleanString(this.configService.get('CLOUD_BASE_ID') || '');
    const testSecretKey = this.cleanString(this.configService.get('CLOUD_BASE_KEY') || '');

    // 获取生产环境凭证（可以用只读凭证或完整凭证）
    const prodReadOnlyId = this.cleanString(this.configService.get('CLOUD_BASE_ID_PROD_READONLY') || '');
    const prodReadOnlyKey = this.cleanString(this.configService.get('CLOUD_BASE_KEY_PROD_READONLY') || '');
    const prodFullId = this.cleanString(this.configService.get('CLOUD_BASE_ID_PROD') || '');
    const prodFullKey = this.cleanString(this.configService.get('CLOUD_BASE_KEY_PROD') || '');

    // 初始化测试环境
    if (testSecretId && testSecretKey) {
      this.testCloudbase = tcb.init({
        secretId: testSecretId,
        secretKey: testSecretKey,
        env: this.testEnvId,
      });
      console.log(`[CloudbaseService] 测试环境已初始化 - env: ${this.testEnvId}`);
    } else {
      console.warn('[CloudbaseService] 测试环境凭证缺失，无法初始化测试环境');
    }

    // 初始化生产环境（优先使用只读凭证）
    if (prodReadOnlyId && prodReadOnlyKey) {
      this.prodCloudbase = tcb.init({
        secretId: prodReadOnlyId,
        secretKey: prodReadOnlyKey,
        env: this.prodEnvId,
      });
      this.isProdReadOnly = true;
      console.log(`[CloudbaseService] 生产环境已初始化（只读） - env: ${this.prodEnvId}`);
    } else if (prodFullId && prodFullKey) {
      this.prodCloudbase = tcb.init({
        secretId: prodFullId,
        secretKey: prodFullKey,
        env: this.prodEnvId,
      });
      this.isProdReadOnly = false;
      console.log(`[CloudbaseService] 生产环境已初始化（完整权限） - env: ${this.prodEnvId}`);
    } else {
      this.isProdReadOnly = true;
      console.warn('[CloudbaseService] 生产环境凭证缺失，无法初始化生产环境');
    }

    // 设置默认实例（兼容旧代码）
    if (nodeEnv === 'test' || nodeEnv === 'development') {
      this.cloudbase = this.testCloudbase;
    } else {
      this.cloudbase = this.prodCloudbase || this.testCloudbase;
    }

    if (!this.testCloudbase && !this.prodCloudbase) {
      throw new Error('缺少云开发凭证配置，至少需要配置一个环境的凭证');
    }

    console.log(`[CloudbaseService] 双环境模式初始化完成 - nodeEnv: ${nodeEnv}, 默认环境: ${nodeEnv === 'test' || nodeEnv === 'development' ? 'test' : 'prod'}`);
  }

  /**
   * 清理字符串中的控制字符
   */
  private cleanString(str: string): string {
    return (str || '').trim().replace(/[\x00-\x1f\x7f]/g, '');
  }

  /**
   * 根据 dataEnv 获取对应的 Cloudbase 实例
   * @param dataEnv - 环境标识：'test' | 'prod'
   * @returns Cloudbase 实例
   */
  getCloudbase(dataEnv: string = 'test'): any {
    if (dataEnv === 'prod') {
      if (!this.prodCloudbase) {
        throw new Error('生产环境未初始化，请检查 CLOUD_BASE_ID_PROD 和 CLOUD_BASE_KEY_PROD 配置');
      }
      return this.prodCloudbase;
    }
    if (!this.testCloudbase) {
      throw new Error('测试环境未初始化，请检查 CLOUD_BASE_ID 和 CLOUD_BASE_KEY 配置');
    }
    return this.testCloudbase;
  }

  /**
   * 根据 dataEnv 获取对应的数据库实例
   * @param dataEnv - 环境标识：'test' | 'prod'
   * @returns 数据库实例
   */
  getDatabase(dataEnv: string = 'test'): any {
    return this.getCloudbase(dataEnv).database();
  }

  /**
   * 根据 dataEnv 获取环境 ID
   * @param dataEnv - 环境标识：'test' | 'prod'
   * @returns 环境 ID
   */
  getEnvId(dataEnv: string = 'test'): string {
    return dataEnv === 'prod' ? this.prodEnvId : this.testEnvId;
  }

  /**
   * 检查指定环境是否可用
   * @param dataEnv - 环境标识：'test' | 'prod'
   * @returns 是否可用
   */
  isEnvAvailable(dataEnv: string = 'test'): boolean {
    if (dataEnv === 'prod') {
      return !!this.prodCloudbase;
    }
    return !!this.testCloudbase;
  }

  /**
   * 调用云函数
   * @param name - 云函数名称
   * @param data - 调用参数
   * @param dataEnv - 环境标识：'test' | 'prod'
   */
  async callFunction(name: string, data: any, dataEnv: string = 'test'): Promise<any> {
    const cloudbase = this.getCloudbase(dataEnv);
    return cloudbase.callFunction({ name, data });
  }

  /**
   * 获取临时文件 URL（用于 cloud:// 转换）
   * @param fileList - 文件 ID 列表
   * @param dataEnv - 环境标识：'test' | 'prod'
   */
  async getTempFileURL(fileList: string[], dataEnv: string = 'test'): Promise<any> {
    const cloudbase = this.getCloudbase(dataEnv);
    return cloudbase.getTempFileURL({ fileList });
  }
}
