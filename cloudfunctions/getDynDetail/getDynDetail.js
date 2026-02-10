// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
    errorCode
} = require('./errorCode');
// const {
//   CONFIG
// } = require('./CONFIG');
const $ = db.command.aggregate;
const host1 = "cloud://prod-juqi-7glu2m8qfa31e13f.7072-prod-juqi-7glu2m8qfa31e13f-1314478640";
const host2 = "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la";
// 给动态点赞
async function getDynDetail(dynId) {
    let {
        list
    } = await db.collection('dyn').aggregate()
        .match({
            _id: dynId
        }).lookup({
            from: 'user',
            let: {
                openId: '$openId'
            },
            pipeline: $.pipeline()
                .match(_.expr(
                    $.eq(['$openId', '$$openId']),
                ))
                .project({
                    _id: 0,
                    avatarUrl: 1,
                    nickName: 1,
                    labels: 1,
                    country: 1,
                    openId: 1,
                    joinStatus: 1,
                    avatarVisitUrl: 1,
                    signature: 1
                })
                .done(),
            as: 'userInfo',
        }).lookup({
            from: 'circle',
            let: {
                circleId: '$circleId'
            },
            pipeline: $.pipeline()
                .match(_.expr(
                    $.eq(['$_id', '$$circleId']),
                ))
                .project({
                    desc: 1,
                    title: 1,
                    _id: 1,
                    followCircleNums: 1,
                    manager: 1,
                    owner: 1
                })
                .done(),
            as: 'circleInfo',
        }).lookup({
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
        }).end();

    if (list[0]) {
        let item = list[0];
        if (item.imageIds && item.imageIds.length > 0) {
            //   item.imageLists = [];
            //   item.imageList.map((img, index) => {
            //       if (img.includes(host1)) {
            //         img = img.replace(host1, host2);
            //       }
            //       item.imageIds[index] = img;
            //       item.imageList[index] = img;
            //       item.imageLists[index] = img + '?imageMogr2/auto-orient/thumbnail/400x2000%3E/quality/70/interlace/1';
            //   })
            // }
            const imageIds = item.imageIds.filter(image => isValidUrl(image))
            item.imageIds = imageIds
            for (let i = 0; i < item.imageIds.length; i++) {
                //console.log('get dyn detail dynvideo', i, item, imageIds)
                const newImageUrl = await getTempFileURL(item.imageIds[i]);
                item.imageIds[i] = newImageUrl
            }

        }

        if (item.dynVideo && item.dynVideo.length > 0) {

            const dynVideo = Array.isArray(item.dynVideo) ? item.dynVideo[0] : item.dynVideo
            item.dynVideo = isValidUrl(dynVideo) ? dynVideo : ''

            for (let i = 0; i < item.dynVideo.length; i++) {
                //console.log('get dyn detail dynvideo', i, item, )
                const newUrl = await getTempFileURL(item.dynVideo[i]);
                item.dynVideo[i] = newUrl
            }

        }


        return list[0];
    }
    return null; // 动态不存在时明确返回 null，避免调用方访问 undefined.dynStatus
  }

  async function getTempFileURL(cloudPath) {
        if (!!!cloudPath) {
            return
        }
        if (!!!cloudPath.startsWith('cloud:')) {
            return cloudPath
        }
        try {
            const {
                fileList
            } = await cloud.getTempFileURL({
                fileList: [{
                    fileID: cloudPath,
                    maxAge: 60 * 60, // one hour
                }]
            })
            return fileList[0].tempFileURL
        } catch (err) {
            console.log('get temp file url err', err)
            return cloudPath
        }
    }

function isValidUrl(url) {
    if (!!!url) {
        return false
    }
    return url.startsWith('https://') || url.startsWith('cloud:') || url.startsWith('http://')
}

exports.getDynDetail = getDynDetail;