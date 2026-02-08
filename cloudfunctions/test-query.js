// 测试脚本：直接查询测试环境数据库
const tcb = require('@cloudbase/node-sdk');

const TEST_ENV_ID = 'test-juqi-3g1m5qa7cc2737a1';

// 初始化云开发
const app = tcb.init({
  secretId: process.env.TENCENT_SECRET_ID || 'YOUR_SECRET_ID',
  secretKey: process.env.TENCENT_SECRET_KEY || 'YOUR_SECRET_KEY',
  env: TEST_ENV_ID
});

const db = app.database();
const _ = db.command;

async function testQuery() {
  console.log('========================================');
  console.log('测试环境数据库查询');
  console.log('环境ID:', TEST_ENV_ID);
  console.log('========================================\n');

  try {
    // 1. 查询 dyn 表总记录数
    const totalCount = await db.collection('dyn').count();
    console.log('1. dyn表总记录数:', totalCount.total);

    // 2. 查询 dynStatus=1 或 6 的记录数
    const visibleCount = await db.collection('dyn').where({
      dynStatus: _.in([1, 6])
    }).count();
    console.log('2. dynStatus=1或6的记录数:', visibleCount.total);

    // 3. 查询最新5条数据（查看完整字段）
    const latestDyns = await db.collection('dyn')
      .limit(3)
      .get();
    
    console.log('\n3. 查看3条数据的完整字段:');
    if (latestDyns.data.length === 0) {
      console.log('   (无数据)');
    } else {
      latestDyns.data.forEach((d, i) => {
        console.log(`\n   === 记录 ${i + 1} ===`);
        console.log('   所有字段:', Object.keys(d).join(', '));
        console.log('   完整数据:', JSON.stringify(d, null, 2).substring(0, 500));
      });
    }

    // 4. 检查 user 表
    const userCount = await db.collection('user').count();
    console.log('\n4. user表总记录数:', userCount.total);
    
    // 5. 查看一条 user 数据
    const sampleUser = await db.collection('user').limit(1).get();
    if (sampleUser.data.length > 0) {
      console.log('5. user表样本字段:', Object.keys(sampleUser.data[0]).join(', '));
    }

  } catch (err) {
    console.error('查询出错:', err.message);
    console.error(err.stack);
  }
}

testQuery();
