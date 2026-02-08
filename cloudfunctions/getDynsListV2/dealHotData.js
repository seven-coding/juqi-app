// 申请置顶
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  formatDate
} = require('./formatDate.js');
const { convertCloudUrl, PROD_CLOUD_HOST, PROD_HTTPS_HOST } = require('./utils/envUrl.js');

// 使用环境感知的 URL 配置
const host1 = PROD_CLOUD_HOST;
const host2 = PROD_HTTPS_HOST;

let userLimit = {
  _id: 0,
  avatarUrl: 1,
  nickName: 1,
  country: 1,
  labels: 1,
  openId: 1,
  avatarVisitUrl: 1,
  joinStatus: 1
}

// 处理数据
async function dealHotData(query, sort, limit, ownOpenId) {
  // 在函数内部获取 db 实例，确保使用正确的环境
  const db = cloud.database()
  const _ = db.command
  const $ = db.command.aggregate;

  limit = 50; 
  console.log(query, sort, limit, ownOpenId);
  // 去掉undefined
  Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);

  let list = (await db.collection('dyn').aggregate()
    .match(query)
    .sort(sort)
    .limit(40)
    .group({
      id_: { "$first": "$_id" },
      _id: '$openId',
      ait: { "$first": "$ait" },
      openId: { "$first": "$openId" },
      circleId: { "$first": "$circleId" },
      circleTitle: { "$first": "$circleTitle" },
      circles: { "$first": "$circles" },
      commentNums: { "$first": "$commentNums" },
      createTime: { "$first": "$createTime" },
      dynContent: { "$first": "$dynContent" },
      dynStatus: { "$first": "$dynStatus" },
      dynType: { "$first": "$dynType" },
      forwardDynId: { "$first": "$forwardDynId" },
      forwardDynStatus: { "$first": "$forwardDynStatus" },
      forwardInfo: { "$first": "$forwardInfo" },
      dynVideo:{ "$first": "$dynVideo" },
      forwardNums:{ "$first": "$forwardNums" },
      imageIds: { "$first": "$imageIds" },
      imageList: { "$first": "$imageList" },
      imageLists: { "$first": "$imageLists" },
      isAudioShow:{ "$first": "$isAudioShow" },
      isDelete: { "$first": "$isDelete" },
      like: { "$first": "$like" },
      likeNums: { "$first": "$likeNums" },
      musicAuthor: { "$first": "$musicAuthor" },
      musicId: { "$first": "$musicId" },
      musicName: { "$first": "$musicName" },
      musicPoster: { "$first": "$musicPoster" },
      musicSrc: { "$first": "$musicSrc" },
      publicTime: { "$first": "$publicTime" },
      riskControlLevel: { "$first": "$riskControlLevel" },
      userTopTime: { "$first": "$userTopTime" },
      topic: { "$first": "$topic" }
    })
    .addFields({
      _id: '$id_'
    })
    .project({
      id_: 0,
    })
    .sort(sort)
    .lookup({
      from: 'user',
      let: {
        openId: '$openId'
      },
      pipeline: $.pipeline()
        .match(_.expr(
          $.eq(['$openId', '$$openId']),
        ))
        .project(userLimit)
        .done(),
      as: 'userInfo',
    })
    .lookup({
      from: 'user_secret',
      let: {
        openId: '$openId'
      },
      pipeline: $.pipeline()
        .match(_.expr(
          $.eq(['$openId', '$$openId']),
        ))
        .project({
          avatarHatTime: 1,
          avatarStatus: 1,
          avatarHatId: 1,
          avatarHat: 1,
          vipStatus: 1,
          dressPlace: 1
        })
        .done(),
      as: 'userSecret',
    })
    .project({
      comments: 0,
    })
    .end()).list;

  // 格式化
  let publicTime, topOpenIds = [];
  if (list.length) {
    publicTime = list[list.length - 1].publicTime;
    list.map((item, index) => {
      item.ifLike = (item.like && item.like.length && item.like.includes(ownOpenId)) ? true : false;
      item.likeStatus = (item.like && item.like.length && item.like.includes(ownOpenId)) ? true : false;
      item.formatDate = formatDate(new Date(item.publicTime).valueOf())

       // 临时兼容图片地址
       if (item.imageList && item.imageList.length) {
        item.imageLists = [];
        item.imageList.map((img, index) => {
          try {
            if (img && img.length && img.includes(host1)) {
              img = img.replace(host1, host2);
              }

            item.imageIds[index] = img;
            item.imageList[index] = img;
            item.imageLists[index] = img + '?imageMogr2/auto-orient/thumbnail/400x2000%3E/quality/70/interlace/1';

          } catch (error) {
            console.log(item.imageList,img)
            console.log(error)
          }
        })
    }

      if (!topOpenIds.includes(item.openId)){
        topOpenIds.push(item.openId);
      } else {
        list.splice(index, 1)
      }
    })
  }
  return {
    list,
    publicTime
  };





}

exports.dealHotData = dealHotData;