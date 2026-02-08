/**
 * URL 转换工具
 * 将 cloud:// 协议的云存储 URL 转换为 HTTPS 临时链接
 */
import { CloudbaseService } from '../modules/cloudbase/cloudbase.service';

/**
 * 批量转换 cloud:// URL 为 HTTPS 临时链接
 * @param cloudbaseService - Cloudbase 服务实例
 * @param urls - URL 数组
 * @param dataEnv - 数据环境
 * @returns 转换后的 URL 数组
 */
export async function convertCloudUrls(
  cloudbaseService: CloudbaseService,
  urls: string[],
  dataEnv: string = 'test',
): Promise<string[]> {
  if (!urls || urls.length === 0) {
    return urls;
  }

  // 筛选出需要转换的 cloud:// URL
  const cloudUrls = urls.filter((url) => url && url.startsWith('cloud://'));
  if (cloudUrls.length === 0) {
    return urls;
  }

  try {
    const result = await cloudbaseService.getTempFileURL(cloudUrls, dataEnv);
    const urlMap = new Map<string, string>();

    (result.fileList || []).forEach((item: any) => {
      if (item.tempFileURL) {
        urlMap.set(item.fileID, item.tempFileURL);
      }
    });

    return urls.map((url) => {
      if (url && url.startsWith('cloud://') && urlMap.has(url)) {
        return urlMap.get(url)!;
      }
      return url;
    });
  } catch (error) {
    console.error('[url-converter] convertCloudUrls error:', error);
    return urls; // 转换失败时返回原始 URL
  }
}

/**
 * 转换单个 cloud:// URL
 * @param cloudbaseService - Cloudbase 服务实例
 * @param url - 单个 URL
 * @param dataEnv - 数据环境
 * @returns 转换后的 URL
 */
export async function convertSingleCloudUrl(
  cloudbaseService: CloudbaseService,
  url: string,
  dataEnv: string = 'test',
): Promise<string> {
  if (!url || !url.startsWith('cloud://')) {
    return url;
  }

  const [converted] = await convertCloudUrls(cloudbaseService, [url], dataEnv);
  return converted;
}

/**
 * 递归转换对象中的所有 cloud:// URL
 * @param cloudbaseService - Cloudbase 服务实例
 * @param obj - 要处理的对象
 * @param dataEnv - 数据环境
 * @param urlFields - 包含 URL 的字段名列表
 * @returns 转换后的对象
 */
export async function convertObjectUrls<T extends Record<string, any>>(
  cloudbaseService: CloudbaseService,
  obj: T,
  dataEnv: string = 'test',
  urlFields: string[] = ['avatar', 'cover', 'images', 'image', 'url', 'fileUrl'],
): Promise<T> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // 收集所有需要转换的 URL
  const urlsToConvert: string[] = [];
  const urlLocations: Array<{ path: string[]; index?: number }> = [];

  function collectUrls(current: any, path: string[] = []) {
    if (!current || typeof current !== 'object') return;

    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        if (typeof item === 'string' && item.startsWith('cloud://')) {
          urlsToConvert.push(item);
          urlLocations.push({ path, index });
        } else if (typeof item === 'object') {
          collectUrls(item, [...path, String(index)]);
        }
      });
    } else {
      for (const [key, value] of Object.entries(current)) {
        if (urlFields.includes(key)) {
          if (typeof value === 'string' && value.startsWith('cloud://')) {
            urlsToConvert.push(value);
            urlLocations.push({ path: [...path, key] });
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'string' && item.startsWith('cloud://')) {
                urlsToConvert.push(item);
                urlLocations.push({ path: [...path, key], index });
              }
            });
          }
        } else if (typeof value === 'object') {
          collectUrls(value, [...path, key]);
        }
      }
    }
  }

  collectUrls(obj);

  if (urlsToConvert.length === 0) {
    return obj;
  }

  // 批量转换
  const convertedUrls = await convertCloudUrls(cloudbaseService, urlsToConvert, dataEnv);

  // 创建结果对象的深拷贝
  const result = JSON.parse(JSON.stringify(obj));

  // 应用转换结果
  urlLocations.forEach((location, i) => {
    let target: any = result;
    for (let j = 0; j < location.path.length - 1; j++) {
      target = target[location.path[j]];
    }

    const lastKey = location.path[location.path.length - 1];
    if (location.index !== undefined) {
      target[lastKey][location.index] = convertedUrls[i];
    } else {
      target[lastKey] = convertedUrls[i];
    }
  });

  return result;
}

/**
 * 批量转换对象数组中的 URL
 * @param cloudbaseService - Cloudbase 服务实例
 * @param objects - 对象数组
 * @param dataEnv - 数据环境
 * @param urlFields - 包含 URL 的字段名列表
 * @returns 转换后的对象数组
 */
export async function convertObjectArrayUrls<T extends Record<string, any>>(
  cloudbaseService: CloudbaseService,
  objects: T[],
  dataEnv: string = 'test',
  urlFields: string[] = ['avatar', 'cover', 'images', 'image', 'url', 'fileUrl'],
): Promise<T[]> {
  if (!objects || objects.length === 0) {
    return objects;
  }

  // 收集所有 cloud:// URL
  const allUrls: string[] = [];

  for (const obj of objects) {
    collectUrlsFromObject(obj, urlFields, allUrls);
  }

  if (allUrls.length === 0) {
    return objects;
  }

  // 去重并批量转换
  const uniqueUrls = [...new Set(allUrls)];
  const convertedUrls = await convertCloudUrls(cloudbaseService, uniqueUrls, dataEnv);

  // 创建 URL 映射
  const urlMap = new Map<string, string>();
  uniqueUrls.forEach((url, i) => {
    urlMap.set(url, convertedUrls[i]);
  });

  // 替换所有 URL
  return objects.map((obj) => {
    return replaceUrlsInObject(obj, urlFields, urlMap);
  });
}

/**
 * 从对象中收集所有 cloud:// URL
 */
function collectUrlsFromObject(
  obj: any,
  urlFields: string[],
  result: string[],
): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item) => collectUrlsFromObject(item, urlFields, result));
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (urlFields.includes(key)) {
      if (typeof value === 'string' && value.startsWith('cloud://')) {
        result.push(value);
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string' && item.startsWith('cloud://')) {
            result.push(item);
          }
        });
      }
    } else if (typeof value === 'object') {
      collectUrlsFromObject(value, urlFields, result);
    }
  }
}

/**
 * 替换对象中的所有 URL
 */
function replaceUrlsInObject<T extends Record<string, any>>(
  obj: T,
  urlFields: string[],
  urlMap: Map<string, string>,
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };

  for (const [key, value] of Object.entries(result)) {
    if (urlFields.includes(key)) {
      if (typeof value === 'string' && urlMap.has(value)) {
        (result as any)[key] = urlMap.get(value);
      } else if (Array.isArray(value)) {
        (result as any)[key] = value.map((item) => {
          if (typeof item === 'string' && urlMap.has(item)) {
            return urlMap.get(item);
          }
          return item;
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        (result as any)[key] = value.map((item) =>
          replaceUrlsInObject(item, urlFields, urlMap),
        );
      } else {
        (result as any)[key] = replaceUrlsInObject(value, urlFields, urlMap);
      }
    }
  }

  return result;
}
