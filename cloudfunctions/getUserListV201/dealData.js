const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

// 处理数据
async function dealData(query, limit, project) {
  // 去掉undefined
  Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);

  let list = (await db.collection('user_followee')
    .aggregate()
    .match(query)
    .limit(limit)
    .project(project)
    .end()).list;

  return {
    list  
  };
}

exports.dealData = dealData;