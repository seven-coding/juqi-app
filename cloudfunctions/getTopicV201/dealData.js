// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate;

const {
  formatDate,
  formatDateTime
} = require('./formatDate.js');
const host1 = "cloud://prod-juqi-7glu2m8qfa31e13f.7072-prod-juqi-7glu2m8qfa31e13f-1314478640";
const host2 = "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la";
const recommendLimit = 3; // 每一页中推荐话题的最大数量


let userLimit = {
  _id: 0,
  avatarUrl: 1,
  avatarHat: 1,
  dressPlace: 1,
  nickName: 1,
  country: 1,
  labels: 1,
  openId: 1,
  avatarVisitUrl: 1,
  joinStatus: 1,
  auth: 1,
  verifierInfo: 1,
  volunteerInfo: 1,
  partnerInfo: 1,
  adminInfo: 1,
  tagOnShow: 1
}

// 处理数据
async function dealData(query, page = 1, pageSize = 20, ownOpenId, dbs) {
  console.log('开始查询')

  // 去掉undefined
  Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);

  const skipCount = (page - 1) * pageSize
  console.log(skipCount)

  let list = (await db.collection('topics')
    .aggregate()
    .match({
      recommend: true
    })
    .sort({
      'joinCounts': -1
    })
    .sort({
      'createTime': -1
    })
    .skip(skipCount)
    .limit(pageSize)
    .end()).list

  console.log(list)
  // 返回结果
  return {
    list,
    page: page + 1
  }
}


exports.dealData = dealData;