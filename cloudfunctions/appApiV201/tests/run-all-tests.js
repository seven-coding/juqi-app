// 运行所有测试
// 版本: 1.0.0
// 用途: 统一运行所有测试模块

const { runAllTests } = require('./utils/test-runner');

/**
 * 运行所有测试
 */
async function main() {
  console.log('========================================');
  console.log('App业务测试 - 完整测试套件');
  console.log('========================================');
  console.log(`开始时间: ${new Date().toLocaleString()}`);
  console.log(`测试环境: 测试环境 (test-juqi-3g1m5qa7cc2737a1)`);
  console.log('========================================\n');
  
  const startTime = Date.now();
  
  try {
    const summary = await runAllTests();
    
    const duration = Date.now() - startTime;
    
    console.log('\n========================================');
    console.log('最终测试汇总');
    console.log('========================================');
    console.log(`总测试数: ${summary.total}`);
    console.log(`通过: ${summary.passed}`);
    console.log(`失败: ${summary.failed}`);
    console.log(`通过率: ${summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(2) : 0}%`);
    console.log(`总耗时: ${duration}ms (${(duration / 1000).toFixed(2)}秒)`);
    console.log('========================================\n');
    
    process.exit(summary.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('测试运行出错:', error);
    process.exit(1);
  }
}

// 运行
main();
