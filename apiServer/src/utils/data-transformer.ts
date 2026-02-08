/**
 * 数据类型转换工具
 * 确保返回给 iOS 的数据类型正确
 */

/**
 * 转换为整数
 * @param value - 任意值
 * @param defaultValue - 默认值
 * @returns 整数
 */
export function toInt(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 转换为浮点数
 * @param value - 任意值
 * @param defaultValue - 默认值
 * @returns 浮点数
 */
export function toFloat(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 转换为布尔值
 * @param value - 任意值
 * @param defaultValue - 默认值
 * @returns 布尔值
 */
export function toBool(value: any, defaultValue: boolean = false): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
    return defaultValue;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return defaultValue;
}

/**
 * 转换为字符串
 * @param value - 任意值
 * @param defaultValue - 默认值
 * @returns 字符串
 */
export function toString(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}

/**
 * 转换为有效的枚举值（iOS Codable 枚举不支持 0 作为 rawValue）
 * @param value - 原始值
 * @param validValues - 有效值列表
 * @param defaultValue - 默认值（当原始值无效时使用）
 * @returns 有效的枚举值
 * 
 * @example
 * // iOS UserJoinStatus: normal=1, pending=2, deleted=-1
 * // 0 不是有效的 rawValue
 * toValidEnum(userInfo.joinStatus, [1, 2, -1], 1) // 0 -> 1
 * 
 * @example
 * // iOS BlackStatus: normal=1, blacked=2, otherBlackedMe=3
 * toValidEnum(userInfo.blackStatus, [1, 2, 3], 1) // 0 -> 1
 */
export function toValidEnum(
  value: any,
  validValues: number[],
  defaultValue: number,
): number {
  const intValue = toInt(value, -999);
  if (validValues.includes(intValue)) {
    return intValue;
  }
  return defaultValue;
}

/**
 * 日期格式化
 * @param date - 日期对象、时间戳或字符串
 * @param defaultValue - 默认值
 * @returns 格式化的日期字符串
 */
export function formatDate(date: any, defaultValue: string = ''): string {
  if (!date) return defaultValue;
  
  let dateObj: Date;
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date._seconds !== undefined) {
    // Firestore Timestamp 格式
    dateObj = new Date(date._seconds * 1000);
  } else {
    return defaultValue;
  }

  if (isNaN(dateObj.getTime())) {
    return defaultValue;
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 批量转换对象字段
 * @param obj - 原始对象
 * @param schema - 转换规则
 * @returns 转换后的对象
 * 
 * @example
 * transformFields(user, {
 *   followCount: 'int',
 *   isVip: 'bool',
 *   joinStatus: { type: 'enum', valid: [1, 2, -1], default: 1 },
 * })
 */
export function transformFields<T extends Record<string, any>>(
  obj: T,
  schema: Record<string, 'int' | 'float' | 'bool' | 'string' | { type: 'enum'; valid: number[]; default: number }>,
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj };

  for (const [key, rule] of Object.entries(schema)) {
    if (!(key in result)) continue;

    if (typeof rule === 'string') {
      switch (rule) {
        case 'int':
          result[key as keyof T] = toInt(result[key]) as any;
          break;
        case 'float':
          result[key as keyof T] = toFloat(result[key]) as any;
          break;
        case 'bool':
          result[key as keyof T] = toBool(result[key]) as any;
          break;
        case 'string':
          result[key as keyof T] = toString(result[key]) as any;
          break;
      }
    } else if (rule.type === 'enum') {
      result[key as keyof T] = toValidEnum(result[key], rule.valid, rule.default) as any;
      break;
    }
  }

  return result;
}

/**
 * 用户 Profile 数据转换
 * 适配 iOS UserProfile Codable 模型
 */
export function transformUserProfile(user: any): any {
  if (!user) return null;

  return {
    ...user,
    id: toString(user._id || user.id || user.openId, ''),
    followCount: toInt(user.followCount),
    fansCount: toInt(user.fansCount),
    likeCount: toInt(user.likeCount),
    publishDynCount: toInt(user.publishDynCount),
    collectCount: toInt(user.collectCount),
    isVip: toBool(user.isVip),
    canSendChat: toBool(user.canSendChat, true),
    // joinStatus: 1=normal, 2=pending, -1=deleted; 0 无效
    joinStatus: toValidEnum(user.joinStatus, [1, 2, -1], 1),
    // blackStatus: 1=normal, 2=blacked, 3=otherBlackedMe; 0 无效
    blackStatus: toValidEnum(user.blackStatus, [1, 2, 3], 1),
    // 布尔字段
    isDailyCheckIn: toBool(user.isDailyCheckIn),
    isShow: toBool(user.isShow, true),
    verified: toBool(user.verified),
  };
}

/**
 * 动态数据转换
 * 适配 iOS DynItem Codable 模型
 */
export function transformDynItem(dyn: any): any {
  if (!dyn) return null;

  return {
    ...dyn,
    id: toString(dyn._id || dyn.id, ''),
    dynStatus: toInt(dyn.dynStatus, 1),
    praiseCount: toInt(dyn.praiseCount),
    commentCount: toInt(dyn.commentCount),
    collectCount: toInt(dyn.collectCount),
    shareCount: toInt(dyn.shareCount),
    isPraised: toBool(dyn.isPraised),
    isCollected: toBool(dyn.isCollected),
    isOwn: toBool(dyn.isOwn),
    // 用户信息
    userInfo: dyn.userInfo ? transformUserProfile(dyn.userInfo) : null,
  };
}

/**
 * 消息统计数据转换
 * 适配 iOS MessageNotReadCount Codable 模型
 */
export function transformMessageCount(count: any): any {
  if (!count) {
    return {
      likeNums: { total: 0 },
      commentNums: { total: 0 },
      chargeNums: { total: 0 },
      applyNums: { total: 0 },
      fansNums: { total: 0 },
    };
  }

  const formatCount = (val: any) => {
    if (typeof val === 'number') {
      return { total: toInt(val) };
    }
    if (typeof val === 'object' && val !== null) {
      return { total: toInt(val.total) };
    }
    return { total: 0 };
  };

  return {
    likeNums: formatCount(count.likeNums),
    commentNums: formatCount(count.commentNums),
    chargeNums: formatCount(count.chargeNums),
    applyNums: formatCount(count.applyNums),
    fansNums: formatCount(count.fansNums),
  };
}
