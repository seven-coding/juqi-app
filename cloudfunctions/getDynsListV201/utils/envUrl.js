/**
 * 环境感知的 URL 配置
 * 根据 envId 返回对应环境的云存储 URL
 */

// 生产环境
const PROD_ENV_ID = 'prod-juqi-7glu2m8qfa31e13f';
const PROD_CLOUD_HOST = `cloud://${PROD_ENV_ID}.7072-${PROD_ENV_ID}-1314478640`;
const PROD_HTTPS_HOST = `https://7072-${PROD_ENV_ID}-1314478640.tcb.qcloud.la`;

// 测试环境
const TEST_ENV_ID = 'test-juqi-3g1m5qa7cc2737a1';
const TEST_CLOUD_HOST = `cloud://${TEST_ENV_ID}.7072-${TEST_ENV_ID}-1314478640`;
const TEST_HTTPS_HOST = `https://7072-${TEST_ENV_ID}-1314478640.tcb.qcloud.la`;

/**
 * 根据 envId 获取对应环境的 URL 配置
 * @param {string} envId - 环境 ID
 * @returns {object} - { cloudHost, httpsHost }
 */
function getEnvUrls(envId) {
  if (envId && envId.includes('test')) {
    return {
      cloudHost: TEST_CLOUD_HOST,
      httpsHost: TEST_HTTPS_HOST
    };
  }
  return {
    cloudHost: PROD_CLOUD_HOST,
    httpsHost: PROD_HTTPS_HOST
  };
}

/**
 * 将 cloud:// URL 转换为 https:// URL
 * 会根据当前环境自动处理两种环境的 URL
 * @param {string} url - 原始 URL
 * @param {string} envId - 环境 ID (可选)
 * @returns {string} - 转换后的 URL
 */
function convertCloudUrl(url, envId) {
  if (!url) return url;
  
  // 如果已经是 https 链接，直接返回
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  
  // 处理 cloud:// 链接
  if (url.startsWith('cloud://')) {
    // 尝试匹配生产环境 URL
    if (url.includes(PROD_ENV_ID)) {
      return url.replace(PROD_CLOUD_HOST, PROD_HTTPS_HOST);
    }
    // 尝试匹配测试环境 URL
    if (url.includes(TEST_ENV_ID)) {
      return url.replace(TEST_CLOUD_HOST, TEST_HTTPS_HOST);
    }
    
    // 根据当前 envId 进行转换
    const { cloudHost, httpsHost } = getEnvUrls(envId);
    if (url.includes(cloudHost)) {
      return url.replace(cloudHost, httpsHost);
    }
  }
  
  return url;
}

module.exports = {
  PROD_ENV_ID,
  PROD_CLOUD_HOST,
  PROD_HTTPS_HOST,
  TEST_ENV_ID,
  TEST_CLOUD_HOST,
  TEST_HTTPS_HOST,
  getEnvUrls,
  convertCloudUrl
};
