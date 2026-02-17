// 上传模块测试
// 版本: 1.0.0

const { 
  runTest, 
  callAppApi, 
  validateResponse, 
  validateErrorResponse,
  startTestSuite,
  endTestSuite,
  resetTestResults
} = require('./utils/test-helper');
const TEST_CONFIG = require('./utils/test-config');
const { generateMockImageData } = require('./utils/mock-data');

/**
 * 测试1: appUploadImage - 上传图片
 */
async function testUploadImage() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const imageData = generateMockImageData();
  
  const result = await callAppApi('appUploadImage', {
    imageData: imageData,
    category: 'dyn'
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!result.data.fileID) {
    throw new Error('缺少fileID');
  }
  
  console.log('  [信息] 图片上传成功，fileID:', result.data.fileID);
}

/**
 * 测试2: appUploadImage - 缺少图片数据
 */
async function testUploadImageMissingData() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appUploadImage', {
    category: 'dyn'
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '图片数据');
}

/**
 * 测试3: appUploadImages - 批量上传图片
 */
async function testUploadImages() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const imageData = generateMockImageData();
  const images = [imageData, imageData, imageData]; // 上传3张图片
  
  const result = await callAppApi('appUploadImages', {
    images: images,
    category: 'dyn'
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  
  if (!Array.isArray(result.data.results)) {
    throw new Error('results不是数组');
  }
  
  if (result.data.successCount === undefined) {
    throw new Error('缺少successCount');
  }
  
  console.log(`  [信息] 批量上传成功: ${result.data.successCount}/${images.length}张`);
}

/**
 * 测试4: appUploadImages - 超过限制
 */
async function testUploadImagesExceedLimit() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const imageData = generateMockImageData();
  const images = Array(10).fill(imageData); // 10张图片，超过9张限制
  
  const result = await callAppApi('appUploadImages', {
    images: images,
    category: 'dyn'
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '最多上传9张');
}

/**
 * 测试5: appUploadImages - 缺少图片数据
 */
async function testUploadImagesMissingData() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appUploadImages', {
    category: 'dyn'
  }, TEST_CONFIG.testToken);
  
  validateErrorResponse(result, 400, '图片数据');
}

/**
 * 运行所有上传模块测试
 */
async function runAllTests() {
  resetTestResults();
  startTestSuite('上传模块测试');
  
  if (!TEST_CONFIG.testToken) {
    console.log('\n[警告] 缺少token，请先运行认证模块测试');
    const summary = endTestSuite();
    return summary;
  }
  
  await runTest('1. appUploadImage - 上传图片', testUploadImage);
  await runTest('2. appUploadImage - 缺少图片数据', testUploadImageMissingData);
  await runTest('3. appUploadImages - 批量上传图片', testUploadImages);
  await runTest('4. appUploadImages - 超过限制', testUploadImagesExceedLimit);
  await runTest('5. appUploadImages - 缺少图片数据', testUploadImagesMissingData);
  
  const summary = endTestSuite();
  return summary;
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests()
    .then(summary => {
      process.exit(summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('测试运行出错:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests
};
