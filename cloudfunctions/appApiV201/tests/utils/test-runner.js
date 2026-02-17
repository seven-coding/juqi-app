// 测试运行器
// 版本: 1.0.0
// 用途: 统一运行所有测试

const fs = require('fs');
const path = require('path');

/**
 * 运行所有测试文件
 */
async function runAllTests(testDir = path.join(__dirname, '..')) {
  // 按顺序运行测试（认证模块必须先运行以获取token）
  const testFiles = [
    { file: 'auth-test.js', name: '认证模块' },
    { file: 'user-test.js', name: '用户模块' },
    { file: 'dyn-test.js', name: '动态模块' },
    { file: 'circle-test.js', name: '圈子模块' },
    { file: 'message-test.js', name: '消息模块' },
    { file: 'search-test.js', name: '搜索模块' },
    { file: 'upload-test.js', name: '上传模块' },
    { file: 'scenario-test.js', name: '业务场景' },
    { file: 'format-test.js', name: '数据格式' }
  ];
  
  const results = [];
  
  for (const { file, name } of testFiles) {
    const filePath = path.join(testDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`运行测试: ${name} (${file})`);
      console.log('='.repeat(50));
      try {
        // 清除require缓存，确保每次都是最新代码
        delete require.cache[require.resolve(filePath)];
        const testModule = require(filePath);
        
        if (typeof testModule.runAllTests === 'function') {
          const result = await testModule.runAllTests();
          results.push({ file, name, ...result });
        } else {
          console.log(`  [跳过] ${file} 没有导出 runAllTests 函数`);
          results.push({ file, name, skipped: true });
        }
      } catch (error) {
        console.error(`  [错误] 运行 ${file} 失败:`, error.message);
        console.error(error.stack);
        results.push({ file, name, error: error.message, failed: true });
      }
    } else {
      console.log(`  [跳过] ${file} 不存在`);
      results.push({ file, name, skipped: true });
    }
  }
  
  // 汇总结果
  const summary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    modules: []
  };
  
  results.forEach(result => {
    if (result.total !== undefined) {
      summary.total += result.total;
      summary.passed += result.passed || 0;
      summary.failed += result.failed || 0;
      if (result.errors) {
        summary.errors.push(...result.errors);
      }
      summary.modules.push({
        name: result.name,
        total: result.total,
        passed: result.passed || 0,
        failed: result.failed || 0
      });
    } else if (result.skipped) {
      summary.skipped++;
    } else if (result.failed) {
      summary.failed++;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('所有测试汇总');
  console.log('='.repeat(50));
  console.log(`总测试数: ${summary.total}`);
  console.log(`通过: ${summary.passed}`);
  console.log(`失败: ${summary.failed}`);
  console.log(`跳过: ${summary.skipped}`);
  console.log(`通过率: ${summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(2) : 0}%`);
  
  if (summary.modules.length > 0) {
    console.log('\n模块测试结果:');
    summary.modules.forEach(module => {
      const passRate = module.total > 0 ? ((module.passed / module.total) * 100).toFixed(2) : 0;
      console.log(`  ${module.name}: ${module.passed}/${module.total} (${passRate}%)`);
    });
  }
  
  if (summary.errors.length > 0) {
    console.log('\n失败详情:');
    summary.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.test}`);
      console.log(`   错误: ${error.error}`);
    });
  }
  
  console.log('='.repeat(50) + '\n');
  
  return summary;
}

module.exports = {
  runAllTests
};
