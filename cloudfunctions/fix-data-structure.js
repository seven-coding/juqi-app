// 修复数据结构脚本：将嵌套的 data 字段展平到根层级
const tcb = require('@cloudbase/node-sdk');

const TEST_ENV_ID = 'test-juqi-3g1m5qa7cc2737a1';

const app = tcb.init({
  secretId: process.env.TENCENT_SECRET_ID || 'YOUR_SECRET_ID',
  secretKey: process.env.TENCENT_SECRET_KEY || 'YOUR_SECRET_KEY',
  env: TEST_ENV_ID
});

const db = app.database();

async function fixCollection(collectionName) {
  console.log(`\n修复 ${collectionName} 表...`);
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  let offset = 0;
  const batchSize = 100;
  
  while (true) {
    // 获取一批数据
    const batch = await db.collection(collectionName)
      .skip(offset)
      .limit(batchSize)
      .get();
    
    if (batch.data.length === 0) {
      break;
    }
    
    for (const record of batch.data) {
      // 检查是否有嵌套的 data 字段
      if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
        try {
          // 提取嵌套数据
          const nestedData = record.data;
          
          // 如果嵌套数据有自己的 _id，保留原始记录的 _id
          delete nestedData._id;
          
          // 更新记录：删除 data 字段，添加展平的字段
          await db.collection(collectionName).doc(record._id).update({
            data: db.command.remove(),
            ...nestedData
          });
          
          fixed++;
          if (fixed % 100 === 0) {
            console.log(`  已修复 ${fixed} 条...`);
          }
        } catch (err) {
          console.error(`  修复记录 ${record._id} 失败:`, err.message);
          errors++;
        }
      } else {
        skipped++;
      }
    }
    
    offset += batchSize;
  }
  
  console.log(`${collectionName} 表修复完成: 修复 ${fixed} 条, 跳过 ${skipped} 条, 错误 ${errors} 条`);
  return { fixed, skipped, errors };
}

async function main() {
  console.log('========================================');
  console.log('修复测试环境数据结构');
  console.log('环境ID:', TEST_ENV_ID);
  console.log('========================================');
  
  // 先检查一条数据确认问题
  const sample = await db.collection('dyn').limit(1).get();
  if (sample.data.length > 0) {
    const record = sample.data[0];
    if (!record.data || typeof record.data !== 'object') {
      console.log('\n数据结构已经正确，无需修复');
      console.log('字段:', Object.keys(record).join(', '));
      return;
    }
    console.log('\n确认数据需要修复，当前结构:');
    console.log('  根级字段:', Object.keys(record).join(', '));
    console.log('  嵌套data字段:', Object.keys(record.data).slice(0, 5).join(', '), '...');
  }
  
  // 修复 dyn 表
  const dynResult = await fixCollection('dyn');
  
  // 修复 user 表
  const userResult = await fixCollection('user');
  
  console.log('\n========================================');
  console.log('修复完成！');
  console.log(`dyn表: 修复 ${dynResult.fixed} 条`);
  console.log(`user表: 修复 ${userResult.fixed} 条`);
  console.log('========================================');
  
  // 验证修复结果
  console.log('\n验证修复结果...');
  const verifyDyn = await db.collection('dyn').limit(1).get();
  if (verifyDyn.data.length > 0) {
    console.log('dyn表字段:', Object.keys(verifyDyn.data[0]).join(', '));
    console.log('dynStatus:', verifyDyn.data[0].dynStatus);
  }
  
  const visibleCount = await db.collection('dyn').where({
    dynStatus: db.command.in([1, 6])
  }).count();
  console.log('可见动态数量(dynStatus=1或6):', visibleCount.total);
}

main().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
