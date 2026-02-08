// 申请置顶
const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
    formatDate,
    formatDateTime
} = require('./formatDate.js');
const { convertCloudUrl, PROD_CLOUD_HOST, PROD_HTTPS_HOST } = require('./utils/envUrl.js');

// 兼容旧代码，同时支持环境感知
const host1 = PROD_CLOUD_HOST;
const host2 = PROD_HTTPS_HOST;


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
async function dealData(query, sort, limit, ownOpenId, dbs) {
    const db = cloud.database();
    const _ = db.command;
    const $ = db.command.aggregate;
    // 去掉undefined
    Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);
    console.log(query, sort, limit, ownOpenId);
    let list = (await db.collection(dbs ? dbs : 'dyn').aggregate()
        .match(query)
        .sort(sort)
        .limit(limit)
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

        // .addFields({
        //   userSecret: [{
        //     avatarHatTime: "$avatarHatTime",
        //     avatarStatus: "$avatarStatus",
        //     avatarHatId: "$avatarHatId",
        //     avatarHat: "$avatarHat",
        //     vipStatus: "$vipStatus",
        //     dressPlace: "$dressPlace",
        //   }]
        // })
        // .lookup({
        //   from: 'awardForActivities',//活动发奖表。dyns 的 _id 字段与 awardForActivities 的 activitySummaryId 字段相等
        //   let: {
        //     dyns_ids: '$_id'
        //   },
        //   pipeline: $.pipeline()
        //     .match(_.expr(
        //       $.eq(['$activitySummaryId', '$$dyns_ids']),
        //     ))
        //     .project({
        //       activitySummaryId:1,//动态id
        //       isOfficialAward:1,//是否官方奖励true/false
        //       rewardTime:1,//奖励时间
        //       awardDetails:1//奖励详情
        //     })
        //     .done(),
        //   as: 'awardForActivities',
        // })
        .end()).list;

    // 格式化
    let publicTime;
    if (list.length) {
        publicTime = list[list.length - 1].publicTime;
        list.forEach(item => {
            // 临时兼容
            item.userSecret = [{
                avatarHatTime: item.userInfo[0] && item.userInfo[0].avatarHatTime ? item.userInfo[0].avatarHatTime : "",
                avatarStatus: item.userInfo[0] && item.userInfo[0].avatarStatus ? item.userInfo[0].avatarStatus : "",
                avatarHatId: item.userInfo[0] && item.userInfo[0].avatarHatId ? item.userInfo[0].avatarHatId : "",
                avatarHat: item.userInfo[0] && item.userInfo[0].avatarHat ? item.userInfo[0].avatarHat : "",
                vipStatus: item.userInfo[0] && item.userInfo[0].vipStatus ? item.userInfo[0].vipStatus : "",
                dressPlace: item.userInfo[0] && item.userInfo[0].dressPlace ? item.userInfo[0].dressPlace : "",
            }];

            item.ifLike = (item.like && item.like.length && item.like.includes(ownOpenId)) ? true : false;
            item.likeStatus = (item.like && item.like.length && item.like.includes(ownOpenId)) ? true : false;
            item.formatDate = formatDate(item.publicTime)

            if (item.imageIds) {
                item.imageIds = item.imageIds.filter(image => isValidUrl(image))
            }
            if (item.imageList) {
                item.imageList = item.imageList.filter(item => isValidUrl(item))
            }
            if (item.dynVideo) {
                const dynVideo = Array.isArray(item.dynVideo) ? item.dynVideo[0] : item.dynVideo
                item.dynVideo = isValidUrl(dynVideo) ? dynVideo : ''
            }


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
                        console.log(item.imageList, img)
                        console.log(error)
                    }
                })
            }
        })
    }

    return {
        list,
        publicTime
    };
}
// 处理收藏数据
async function dealFavoriteDynListData(query, sort, limit, ownOpenId) {
    // 在函数内部获取 db 实例，确保使用正确的环境
    const db = cloud.database();
    const _ = db.command;
    const $ = db.command.aggregate;

    console.log(query, sort, limit, ownOpenId);
    // 去掉undefined
    Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);

    let list = (await db.collection('dynFavorite').aggregate()
        .match(query)
        .sort(sort)
        .limit(limit)
        .lookup({
            from: 'dyn',
            let: {
                dyns_ids: '$dynId'
            },
            pipeline: $.pipeline()
                .match(_.expr(
                    $.eq(['$_id', '$$dyns_ids']),
                ))
                .done(),
            as: 'dynList',
        })
        .lookup({
            from: 'user',
            let: {
                openId: '$upOpenId'
            },
            pipeline: $.pipeline()
                .match(_.expr(
                    $.eq(['$openId', '$$openId']),
                ))
                .project(userLimit)
                .done(),
            as: 'userInfo',
        })
        // .lookup({
        //   from: 'user_secret',
        //   let: {
        //     openId: '$openId'
        //   },
        //   pipeline: $.pipeline()
        //     .match(_.expr(
        //       $.eq(['$openId', '$$openId']),
        //     ))
        //     .project({
        //       avatarHatTime: 1,
        //       avatarStatus: 1,
        //       avatarHatId: 1,
        //       avatarHat: 1,
        //       vipStatus: 1,
        //       dressPlace: 1
        //     })
        //     .done(),
        //   as: 'userSecret',
        // })
        .project({
            comments: 0,
        })
        .end()).list;

    // 格式化
    let publicTime;
    if (list.length) {
        publicTime = list[list.length - 1].createDate;
        for (let i = 0, lens = list.length; i < lens; i++) {

            // 临时处理userSecret
            list[i].userSecret = [{
                avatarHatTime: list[i].userInfo[0].avatarHatTime,
                avatarStatus: list[i].userInfo[0].avatarStatus,
                avatarHatId: list[i].userInfo[0].avatarHatId,
                avatarHat: list[i].userInfo[0].avatarHat,
                vipStatus: list[i].userInfo[0].vipStatus,
                dressPlace: list[i].userInfo[0].dressPlace,
            }]

            list[i] = {
                ...list[i],
                ...list[i].dynList[0]
            }
            list[i].ifLike = (list[i].like && list[i].like.length && list[i].like.includes(ownOpenId)) ? true : false;
            list[i].likeStatus = (list[i].like && list[i].like.length && list[i].like.includes(ownOpenId)) ? true : false;
            list[i].formatDate = formatDate(new Date(list[i].publicTime).valueOf())
            if (list[i].imageIds) {
                list[i].imageIds = list[i].imageIds.filter(image => isValidUrl(image))
            }
            if (list[i].imageList) {
                list[i].imageList = list[i].imageList.filter(img => isValidUrl(img))
            }
            if (list[i].dynVideo) {
                list[i].dynVideo = list[i].dynVideo.filter(video => isValidUrl(video))
            }


            // 临时兼容图片地址
            if (list[i].imageList && list[i].imageList.length) {
                list[i].imageLists = [];
                list[i].imageList.map((img, index) => {
                    list[i].imageLists[index] = img + '?imageMogr2/auto-orient/thumbnail/400x2000%3E/quality/70/interlace/1';
                })
            }
        }
    }
    return {
        list,
        publicTime
    };
}

function isValidUrl(url) {
    if (!!!url) {
        return false
    }
    return url.startsWith('https://') || url.startsWith('cloud:') || url.startsWith('http://')
}

exports.dealData = dealData;
exports.dealFavoriteDynListData = dealFavoriteDynListData;