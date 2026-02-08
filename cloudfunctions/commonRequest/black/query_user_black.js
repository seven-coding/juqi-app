const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

async function query_dataset(query, limit=20, project={}) {
  // 去掉undefined
  Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);

  let list = (await db.collection('user_black')
    .aggregate()
    .match(query)
    .limit(limit)
    .end()).list;

    console.log(query)
    console.log(list)

  return list;
}


exports.query_dataset = query_dataset;